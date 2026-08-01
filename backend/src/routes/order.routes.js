import { Router } from 'express';
import StoreOrder from '../models/StoreOrder.js';
import RecycledProduct from '../models/RecycledProduct.js';
import RiderProfile from '../models/RiderProfile.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { confirmCodPayment, creditOrderCommissions } from '../services/payments.js';
import { createNotification } from '../services/notify.js';

const router = Router();

function formatOrder(o) {
  return {
    id: o._id.toString(),
    _id: o._id,
    productId: o.productId?._id || o.productId,
    buyerId: o.buyerId?._id?.toString() || o.buyerId?.toString(),
    vendorId: o.vendorId?._id?.toString() || o.vendorId?.toString(),
    originalOwnerId: o.originalOwnerId?._id?.toString() || o.originalOwnerId?.toString(),
    riderId: o.riderId?._id?.toString() || o.riderId?.toString() || null,
    amount: o.amount,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    commission: o.commission,
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    buyer: o.buyerId?.name ? { name: o.buyerId.name, email: o.buyerId.email } : undefined,
    vendor: o.vendorId?.name ? { name: o.vendorId.name, email: o.vendorId.email } : undefined,
    rider: o.riderId?.name ? { name: o.riderId.name, email: o.riderId.email } : undefined,
    product: o.productId?.title
      ? { title: o.productId.title, images: o.productId.images, category: o.productId.category }
      : undefined,
  };
}

// Emit a socket event for order status changes
function emitOrderUpdate(req, order) {
  const io = req.app.get('io');
  if (io) {
    io.emit('order_status_changed', {
      orderId: order._id.toString(),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      buyerId: order.buyerId?.toString() || order.buyerId,
      vendorId: order.vendorId?.toString() || order.vendorId,
      riderId: order.riderId?.toString() || order.riderId || null,
    });
  }
}

// ─── User: Get my purchases ───────────────────────────────────────────────────
router.get(
  '/my',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const orders = await StoreOrder.find({ buyerId: req.user._id })
      .populate('productId', 'title images category')
      .populate('vendorId', 'name email')
      .populate('riderId', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  })
);

// ─── User / Vendor: Get sales ─────────────────────────────────────────────────
router.get(
  '/sales',
  protect,
  asyncHandler(async (req, res) => {
    const filter =
      req.user.role === 'vendor'
        ? { vendorId: req.user._id }
        : req.user.role === 'user'
          ? { originalOwnerId: req.user._id }
          : {};
    const orders = await StoreOrder.find(filter)
      .populate('productId', 'title images category')
      .populate('buyerId', 'name email')
      .populate('vendorId', 'name email')
      .populate('riderId', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  })
);

// ─── Vendor: Get incoming store orders ───────────────────────────────────────
router.get(
  '/vendor/orders',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const orders = await StoreOrder.find({ vendorId: req.user._id })
      .populate('productId', 'title images category')
      .populate('buyerId', 'name email')
      .populate('riderId', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  })
);

// ─── Rider: Get assigned delivery orders ─────────────────────────────────────
// IMPORTANT: This endpoint returns only store delivery orders assigned to the logged-in rider.
// Orders are filtered by: riderId (exact ObjectId match) and orderStatus in ['rider_assigned', 'out_for_delivery']
// The riderId is explicitly populated so rider data is available in the response.
router.get(
  '/rider/orders',
  protect,
  authorize('rider'),
  asyncHandler(async (req, res) => {
    // Query for orders where riderId matches the logged-in rider's ObjectId
    // and orderStatus is either 'rider_assigned' or 'out_for_delivery' (active delivery states)
    const orders = await StoreOrder.find({
      riderId: req.user._id,
      orderStatus: { $in: ['rider_assigned', 'out_for_delivery'] }
    })
      .populate('productId', 'title images category')
      .populate('buyerId', 'name email')
      .populate('vendorId', 'name email')
      .populate('riderId', 'name email')  // Explicitly populate rider so rider data is always available
      .sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  })
);

// ─── Admin: Get all orders ───────────────────────────────────────────────────
router.get(
  '/all',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const orders = await StoreOrder.find()
      .populate('productId', 'title images category')
      .populate('buyerId', 'name email')
      .populate('vendorId', 'name email')
      .populate('originalOwnerId', 'name email')
      .populate('riderId', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  })
);

// ─── Earnings ─────────────────────────────────────────────────────────────────
router.get(
  '/earnings',
  protect,
  asyncHandler(async (req, res) => {
    const filter =
      req.user.role === 'admin'
        ? {}
        : req.user.role === 'vendor'
          ? { vendorId: req.user._id }
          : { $or: [{ originalOwnerId: req.user._id }, { buyerId: req.user._id }] };

    const orders = await StoreOrder.find({ ...filter, paymentStatus: 'paid' });
    let total = 0;
    const transactions = orders.map((o) => {
      let earned = 0;
      if (req.user.role === 'vendor') earned = o.commission.vendor;
      else if (req.user.role === 'admin') earned = o.commission.admin;
      else if (o.originalOwnerId.toString() === req.user._id.toString()) earned = o.commission.user;
      total += earned;
      return { orderId: o._id, amount: o.amount, earned, date: o.createdAt, paymentMethod: o.paymentMethod };
    });
    res.json({ total: Math.round(total * 100) / 100, transactions });
  })
);

// ─── Vendor: Process order (pending → processing) ────────────────────────────
router.patch(
  '/:id/process',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const order = await StoreOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.vendorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (order.orderStatus !== 'pending') {
      return res.status(400).json({ message: `Cannot process order in status: ${order.orderStatus}` });
    }

    order.orderStatus = 'processing';
    await order.save();

    await createNotification(order.buyerId, {
      type: 'info',
      title: 'Order Processing',
      message: 'The vendor has confirmed your order and is preparing it for delivery.',
      link: '/dashboard/store-orders',
    });

    emitOrderUpdate(req, order);

    const populated = await StoreOrder.findById(order._id)
      .populate('productId', 'title images category')
      .populate('buyerId vendorId riderId', 'name email');
    res.json(formatOrder(populated));
  })
);

// ─── Vendor: Assign rider (processing → rider_assigned) ────────────────
router.patch(
  '/:id/assign-rider',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const { riderId } = req.body;
    if (!riderId) return res.status(400).json({ message: 'riderId is required' });

    const order = await StoreOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.vendorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!['pending', 'processing'].includes(order.orderStatus)) {
      return res.status(400).json({ message: `Cannot assign rider for order in status: ${order.orderStatus}` });
    }

    order.riderId = riderId;
    order.orderStatus = 'rider_assigned';
    await order.save();

    // Update rider availability
    const riderProfile = await RiderProfile.findOne({ userId: riderId });
    if (riderProfile) {
      riderProfile.availabilityStatus = 'assigned';
      await riderProfile.save();
    }

    await createNotification(riderId, {
      type: 'info',
      title: 'New Delivery Assignment',
      message: 'You have been assigned a store order delivery.',
      link: '/rider/dashboard',
    });
    await createNotification(order.buyerId, {
      type: 'info',
      title: 'Rider Assigned',
      message: 'A rider has been assigned to deliver your order.',
      link: '/dashboard/store-orders',
    });

    emitOrderUpdate(req, order);

    const populated = await StoreOrder.findById(order._id)
      .populate('productId', 'title images category')
      .populate('buyerId vendorId riderId', 'name email');
    res.json(formatOrder(populated));
  })
);

// ─── Rider: Mark out for delivery (rider_assigned → out_for_delivery) ─────────
router.patch(
  '/:id/out-for-delivery',
  protect,
  authorize('rider'),
  asyncHandler(async (req, res) => {
    const order = await StoreOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.riderId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (order.orderStatus !== 'rider_assigned') {
      return res.status(400).json({ message: `Cannot update order in status: ${order.orderStatus}` });
    }

    order.orderStatus = 'out_for_delivery';
    await order.save();

    // Update rider status
    const riderProfile = await RiderProfile.findOne({ userId: req.user._id });
    if (riderProfile) {
      riderProfile.availabilityStatus = 'on_pickup';
      await riderProfile.save();
    }

    await createNotification(order.buyerId, {
      type: 'info',
      title: 'Order Out for Delivery',
      message: 'Your order is on its way! The rider is heading to your address.',
      link: '/dashboard/store-orders',
    });

    emitOrderUpdate(req, order);

    const populated = await StoreOrder.findById(order._id)
      .populate('productId', 'title images category')
      .populate('buyerId vendorId riderId', 'name email');
    res.json(formatOrder(populated));
  })
);

// ─── Rider/Vendor/Admin: Mark delivered (out_for_delivery → delivered) ────────
router.patch(
  '/:id/deliver',
  protect,
  authorize('rider', 'vendor', 'admin'),
  asyncHandler(async (req, res) => {
    const order = await StoreOrder.findById(req.params.id).populate('productId');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Riders can only deliver their own assigned orders
    if (req.user.role === 'rider' && order.riderId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'vendor' && order.vendorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    order.orderStatus = 'delivered';
    if (order.paymentMethod === 'cod') {
      // For COD: vendor/rider confirms cash was collected
      order.paymentStatus = 'paid';
    }
    await order.save();

    // Credit commissions to all parties
    await creditOrderCommissions(order, order.productId);

    // Free up rider
    if (order.riderId) {
      const riderProfile = await RiderProfile.findOne({ userId: order.riderId });
      if (riderProfile) {
        riderProfile.availabilityStatus = 'available';
        await riderProfile.save();
      }
    }

    await createNotification(order.buyerId, {
      type: 'success',
      title: 'Order Delivered!',
      message: `Your order has been delivered successfully.${order.paymentMethod === 'cod' ? ' Cash payment recorded.' : ''}`,
      link: '/dashboard/store-orders',
    });
    await createNotification(order.vendorId, {
      type: 'success',
      title: 'Order Delivered',
      message: 'Store order delivered successfully. Commission has been credited to your wallet.',
      link: `/vendor/dashboard/orders/${order._id}`,
    });
    if (order.riderId) {
      await createNotification(order.riderId, {
        type: 'success',
        title: 'Delivery Completed',
        message: 'You have completed the delivery.',
        link: '/rider/dashboard',
      });
    }

    emitOrderUpdate(req, order);

    const populated = await StoreOrder.findById(order._id)
      .populate('productId', 'title images category')
      .populate('buyerId vendorId riderId', 'name email');
    res.json(formatOrder(populated));
  })
);

// ─── User/Admin: Cancel order ─────────────────────────────────────────────────
router.patch(
  '/:id/cancel',
  protect,
  authorize('user', 'admin'),
  asyncHandler(async (req, res) => {
    const order = await StoreOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role === 'user' && order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!['pending', 'processing'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Order can only be cancelled if pending or processing' });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    // Refund wallet payment
    if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
      const { creditWallet } = await import('../services/wallet.js');
      await creditWallet(order.buyerId, order.amount, 'refund', `Refund for cancelled order #${order._id.toString().slice(-6)}`, { orderId: order._id });
      order.paymentStatus = 'failed'; // mark as failed/refunded
      await order.save();
    }

    // Re-list the product so others can buy it
    await RecycledProduct.findByIdAndUpdate(order.productId, { status: 'listed' });

    await createNotification(order.buyerId, {
      type: 'warning',
      title: 'Order Cancelled',
      message: `Your order has been cancelled.${order.paymentMethod === 'wallet' ? ' Your payment has been refunded.' : ''}`,
      link: '/dashboard/store-orders',
    });
    await createNotification(order.vendorId, {
      type: 'warning',
      title: 'Order Cancelled',
      message: 'A store order was cancelled.',
      link: `/vendor/dashboard/orders/${order._id}`,
    });

    emitOrderUpdate(req, order);

    const populated = await StoreOrder.findById(order._id)
      .populate('productId', 'title images category')
      .populate('buyerId vendorId riderId', 'name email');
    res.json(formatOrder(populated));
  })
);

// ─── Legacy: Confirm COD payment ──────────────────────────────────────────────
router.patch(
  '/:id/confirm-cod',
  protect,
  authorize('vendor', 'admin'),
  asyncHandler(async (req, res) => {
    const order = await StoreOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role === 'vendor' && order.vendorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await confirmCodPayment(order._id);
    emitOrderUpdate(req, updated);
    res.json(formatOrder(updated));
  })
);

export default router;
