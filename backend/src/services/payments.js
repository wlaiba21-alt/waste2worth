import StoreOrder from '../models/StoreOrder.js';
import RecycledProduct from '../models/RecycledProduct.js';
import RecyclingRequest from '../models/RecyclingRequest.js';
import User from '../models/User.js';
import { splitCommission } from '../utils/commission.js';
import { creditWallet, debitWallet } from './wallet.js';
import { createNotification } from './notify.js';
import Transaction from '../models/Transaction.js';

/**
 * Create a new store order when user purchases a product.
 * - orderStatus always starts as 'pending' (awaiting vendor confirmation)
 * - Wallet payment: buyer wallet debited immediately; commissions credited on delivery
 * - COD payment: nothing debited; commissions credited when vendor confirms COD receipt
 * - Stripe payment: payment is already completed, so mark as paid immediately
 */
export async function processStorePurchase({ product, buyer, paymentMethod, shippingAddress }) {
  const amount = product.price;
  const commission = splitCommission(amount);

  const order = await StoreOrder.create({
    productId: product._id,
    requestId: product.requestId,
    buyerId: buyer._id,
    vendorId: product.vendorId,
    originalOwnerId: product.ownerUserId,
    amount,
    paymentMethod,
    paymentStatus: paymentMethod === 'wallet' || paymentMethod === 'stripe' ? 'paid' : 'pending',
    orderStatus: 'pending', // Always start as pending — vendor must confirm
    commission,
    shippingAddress,
  });

  // For wallet payments, debit buyer immediately
  if (paymentMethod === 'wallet') {
    await debitWallet(buyer._id, amount, 'purchase', `Store purchase: ${product.title}`, { orderId: order._id });
  }

  // Mark product as sold to remove from listings
  product.status = 'sold';
  await product.save();

  // Notifications
  await createNotification(product.ownerUserId, {
    type: 'info',
    title: paymentMethod === 'wallet' || paymentMethod === 'stripe' ? 'Product Sold' : 'COD Order Placed',
    message: `Your recycled product "${product.title}" was purchased for $${amount.toFixed(2)}.`,
    link: '/dashboard/store-orders',
  });
  await createNotification(product.vendorId, {
    type: 'success',
    title: 'New Store Order',
    message: `"${product.title}" ordered via ${paymentMethod.toUpperCase()}. Please confirm and arrange delivery.`,
    link: `/vendor/dashboard/orders/${order._id}`,
  });
  await createNotification(buyer._id, {
    type: 'success',
    title: 'Order Placed!',
    message: `Order #${order._id.toString().slice(-6)} placed successfully. Waiting for vendor to process.`,
    link: '/dashboard/store-orders',
  });

  return order;
}

/**
 * Complete a Stripe purchase after successful payment
 */
export async function completeStripePurchase({ product, buyer, shippingAddress, stripePaymentIntentId }) {
  const amount = product.price;
  const commission = splitCommission(amount);

  const order = await StoreOrder.create({
    productId: product._id,
    requestId: product.requestId,
    buyerId: buyer._id,
    vendorId: product.vendorId,
    originalOwnerId: product.ownerUserId,
    amount,
    paymentMethod: 'stripe',
    paymentStatus: 'paid',
    orderStatus: 'pending',
    commission,
    shippingAddress,
  });

  // Create transaction for stripe purchase
  await Transaction.create({
    userId: buyer._id,
    type: 'purchase',
    amount: -amount,
    balanceAfter: buyer.walletBalance,
    description: `Store purchase: ${product.title}`,
    orderId: order._id,
    meta: { stripePaymentIntentId },
  });

  // Credit the original owner's wallet (user) after successful Stripe payment
  const productValue = product.price;
  const recyclingExpense = Math.round(productValue * 0.1 * 100) / 100; // 10% recycling expense
  const pickupServiceCharge = Math.round(productValue * 0.05 * 100) / 100; // 5% pickup charge
  const finalReward = Math.round((productValue - recyclingExpense - pickupServiceCharge) * 100) / 100;
  
  await creditWallet(
    product.ownerUserId,
    finalReward,
    'recycling_reward',
    `Reward for selling recycled ${product.category}`,
    {
      productId: product._id,
      productName: product.title,
      productValue,
      recyclingExpense,
      pickupServiceCharge,
      finalReward
    }
  );

  // Mark product as sold
  product.status = 'sold';
  await product.save();

  // Credit vendor's wallet ONLY after successful Stripe payment
  await creditWallet(
    product.vendorId, 
    commission.vendor, 
    'sale_commission', 
    `Sale commission: ${product.title}`, 
    { 
      orderId: order._id,
      productId: product._id,
      productName: product.title,
    }
  );

  // Credit admin platform fee ONLY after successful Stripe payment
  const admin = await User.findOne({ role: 'admin' });
  if (admin) {
    await creditWallet(admin._id, commission.admin, 'sale_commission', `Platform fee: ${product.title}`, { 
      orderId: order._id,
      productId: product._id,
    });
  }

  // Notifications
  await createNotification(product.ownerUserId, {
    type: 'info',
    title: 'Product Sold',
    message: `Your recycled product "${product.title}" was purchased for $${amount.toFixed(2)}.`,
    link: '/dashboard/store-orders',
  });
  await createNotification(product.vendorId, {
    type: 'success',
    title: 'New Store Order',
    message: `"${product.title}" ordered via STRIPE. Please confirm and arrange delivery.`,
    link: `/vendor/dashboard/orders/${order._id}`,
  });
  await createNotification(buyer._id, {
    type: 'success',
    title: 'Order Placed!',
    message: `Order #${order._id.toString().slice(-6)} placed successfully. Waiting for vendor to process.`,
    link: '/dashboard/store-orders',
  });

  return order;
}

/**
 * Credit all commissions when an order is delivered.
 * Called for both wallet orders (on delivery) and COD orders (after vendor confirms cash received).
 */
export async function creditOrderCommissions(order, product) {
  // All commissions are now processed instantly during purchase,
  // so this function intentionally does nothing for wallet updates.
}

/**
 * Confirm COD payment and trigger commission payouts.
 * @deprecated Use PATCH /orders/:id/deliver instead which triggers this automatically.
 */
export async function confirmCodPayment(orderId) {
  const order = await StoreOrder.findById(orderId).populate('productId');
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (order.paymentMethod !== 'cod') throw Object.assign(new Error('Not a COD order'), { statusCode: 400 });
  if (order.paymentStatus === 'paid') throw Object.assign(new Error('Already paid'), { statusCode: 400 });

  const product = order.productId;

  order.paymentStatus = 'paid';
  order.orderStatus = 'delivered';
  await order.save();

  await creditOrderCommissions(order, product);

  await createNotification(order.buyerId, {
    type: 'success',
    title: 'COD Payment Confirmed',
    message: 'Your cash on delivery payment has been recorded.',
  });

  return order;
}
