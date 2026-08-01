import { Router } from 'express';
import RecycledProduct from '../models/RecycledProduct.js';
import RecyclingRequest from '../models/RecyclingRequest.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upload, setUploadFolder } from '../middleware/upload.js';
import { createNotification, createMultipleNotifications } from '../services/notify.js';
import { creditWallet, debitWallet } from '../services/wallet.js';

import { processStorePurchase, completeStripePurchase } from '../services/payments.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

function formatProduct(req, p) {
  return {
    id: p._id.toString(),
    _id: p._id,
    requestId: p.requestId,
    vendorId: p.vendorId?._id?.toString() || p.vendorId?.toString(),
    ownerUserId: p.ownerUserId?._id?.toString() || p.ownerUserId?.toString(),
    ownerId: p.ownerId?._id?.toString() || p.ownerId?.toString(),
    productOwnerId: p.productOwnerId?._id?.toString() || p.productOwnerId?.toString(),
    title: p.title,
    description: p.description,
    images: (p.images || []).map((img) => {
      if (img.startsWith('http')) return img;
      // Ensure path starts with /uploads
      if (img.startsWith('/uploads')) return img;
      if (img.startsWith('uploads')) return `/${img}`;
      return img;
    }),
    category: p.category,
    price: p.price,
    status: p.status,
    recycleType: p.recycleType,
    productStatus: p.productStatus,
    isAvailable: p.isAvailable,
    createdAt: p.createdAt,
    recycleDecision: p.recycleDecision,
    commissionPercentage: p.commissionPercentage,
    returnStatus: p.returnStatus,
    // Include recycling date from associated RecyclingRequest
    recyclingDate: p.recyclingRequest?.recyclingCompletedAt || null,
    vendor: p.vendorId?.name
      ? { name: p.vendorId.name, businessName: p.vendorProfile?.businessName }
      : undefined,
    owner: p.ownerUserId?.name ? { name: p.ownerUserId.name } : undefined,
  };
}

// Vendor creates product after recycling
router.post(
  '/products/from-request/:requestId',
  protect,
  authorize('vendor'),
  setUploadFolder('products'),
  upload.array('images', 5),
  asyncHandler(async (req, res) => {
    const request = await RecyclingRequest.findById(req.params.requestId);
    if (!request || request.vendorId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'recycling_completed') {
      return res.status(400).json({ message: 'Request must be recycling completed first' });
    }
    if (request.recycledProductId) {
      return res.status(400).json({ message: 'Product already created' });
    }

    const base = `/uploads/products`;
    const images = (req.files || []).map((f) => `${base}/${f.filename}`);
    if (req.body.imageUrl) images.push(req.body.imageUrl);

    const product = await RecycledProduct.create({
      requestId: request._id,
      vendorId: request.vendorId,
      ownerUserId: request.userId,
      title: req.body.title || `${request.category} Recycled Product`,
      description: req.body.description || '',
      images: images.length ? images : [request.image],
      category: request.category,
      price: parseFloat(req.body.price) || 25,
      status: 'awaiting_choice',
      recycleType: req.body.recycleType || request.category,
      productStatus: req.body.productStatus || 'good',
      isAvailable: true,
    });

    request.recycledProductId = product._id;
    await request.save();

    await createNotification(request.userId, {
      type: 'info',
      title: 'Your Recycled Product is Ready',
      message: `Choose to take it back or list "${product.title}" in the store.`,
      link: `/dashboard/product-choice/${product._id}`,
    });

    const populated = await RecycledProduct.findById(product._id).populate('vendorId ownerUserId', 'name');
    res.status(201).json(formatProduct(req, populated));
  })
);

// User choice: take_back | list_for_sale
router.patch(
  '/products/:id/choice',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const { choice, returnAddress } = req.body;
    if (!['take_back', 'list_for_sale'].includes(choice)) {
      return res.status(400).json({ message: 'Invalid choice' });
    }
    const product = await RecycledProduct.findById(req.params.id);
    if (!product || product.ownerUserId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (product.status !== 'awaiting_choice') {
      return res.status(400).json({ message: 'Choice already made' });
    }

    product.recycleDecision = choice;

    // Get admin IDs for notifications
    const admins = await User.find({ role: 'admin' }).select('_id');
    const adminIds = admins.map(a => a._id);

    if (choice === 'take_back') {
      product.status = 'return_requested';
      product.returnStatus = 'requested';
      // Update associated RecyclingRequest to return_requested status
      const request = await RecyclingRequest.findById(product.requestId);
      if (request) {
        request.status = 'return_requested';
        request.postRecyclingChoice = 'return';
        if (returnAddress) request.returnAddress = returnAddress;
        await request.save();

        // Apply service charges if they exist
        const productValue = request.estimatedReward || 0;
        const recyclingExpense = Math.round(productValue * 0.1 * 100) / 100;
        const totalCharge = recyclingExpense;

        if (totalCharge > 0) {
          await debitWallet(request.userId, totalCharge, 'recycling_service_charge', `Service charge for returning recycled ${request.category}`, { requestId: request._id });
          if (recyclingExpense > 0) {
            await creditWallet(request.vendorId, recyclingExpense, 'recycling_service_charge', `Recycling service fee for ${request.category}`, { requestId: request._id });
          }
        }
      }

      // Notify vendor and admins
      await createNotification(product.vendorId, {
        type: 'info',
        title: 'Return Requested',
        message: 'User requested to get their recycled product back.',
        link: '/vendor/dashboard/requests',
      });
      await createMultipleNotifications(adminIds, {
        type: 'info',
        title: 'Return Requested',
        message: `${req.user.name} requested to get their recycled product back.`,
        link: '/admin/dashboard/requests',
      });
    } else {
      product.status = 'listed';
      // Update associated RecyclingRequest
      const request = await RecyclingRequest.findById(product.requestId);
      if (request) {
        request.status = 'product_sold';
        request.postRecyclingChoice = 'sell';

        // finalReward stays 0 — the user's wallet is only credited after a buyer
        // purchases the product and the order is marked delivered.
        // See creditOrderCommissions() in services/payments.js which handles the
        // full user/vendor/admin split on delivery.
        request.finalReward = 0;

        await request.save();
      }

      await createNotification(product.vendorId, {
        type: 'info',
        title: 'Product Listed for Sale',
        message: 'User chose to sell the recycled product. It is now listed in the marketplace.',
        link: '/vendor/dashboard/requests',
      });
    }
    await product.save();

    // Populate recyclingRequest for formatProduct
    const populatedProduct = await RecycledProduct.findById(product._id)
      .populate('vendorId ownerUserId', 'name')
      .populate({ path: 'requestId', model: 'RecyclingRequest', select: 'recyclingCompletedAt' });
    
    const productWithRequest = {
      ...populatedProduct._doc,
      recyclingRequest: populatedProduct.requestId
    };

    res.json(formatProduct(req, productWithRequest));
  })
);

// Update product (owner/vendor only)
router.patch(
  '/products/:id',
  protect,
  setUploadFolder('products'),
  upload.array('images', 5),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log('🔵 [UPDATE PRODUCT] Request params id:', id);
    console.log('🔵 [UPDATE PRODUCT] Request user:', req.user);
    console.log('🔵 [UPDATE PRODUCT] Request files:', req.files);
    console.log('🔵 [UPDATE PRODUCT] Request body:', req.body);

    const product = await RecycledProduct.findById(id);
    if (!product) {
      console.log('🔴 [UPDATE PRODUCT] Product NOT found with id:', id);
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('🔵 [UPDATE PRODUCT] Found product:', product);
    
    // Check ownership: only owner or vendor can edit
    const isOwner = product.ownerUserId.toString() === req.user._id.toString();
    const isVendor = product.vendorId.toString() === req.user._id.toString();
    console.log('🔵 [UPDATE PRODUCT] isOwner:', isOwner, 'isVendor:', isVendor, 'user role:', req.user.role);
    if (!isOwner && !isVendor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this product' });
    }
    
    // Extract fields from req.body safely
    const { title, description, images, category, price, recycleType, productStatus, isAvailable } = req.body;
    
    // Update fields if provided
    if (title) product.title = title;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price !== undefined && price !== null && price !== '') {
      product.price = parseFloat(price);
    }
    if (recycleType) product.recycleType = recycleType;
    if (productStatus) product.productStatus = productStatus;
    if (isAvailable !== undefined) product.isAvailable = isAvailable;
    
    // If new images uploaded, use those, else keep existing
    if (req.files && req.files.length > 0) {
      const base = '/uploads/products';
      product.images = req.files.map(file => `${base}/${file.filename}`);
    } else if (images) {
      // If images provided as JSON array, use those but strip base URLs if needed
      let parsedImages = typeof images === 'string' ? JSON.parse(images) : images;
      
      // Strip any base URL from images to store just the path
      product.images = parsedImages.map(img => {
        if (typeof img !== 'string') return img;
        // Check if it's a full URL
        if (img.startsWith('http')) {
          // Extract just the path part
          try {
            const url = new URL(img);
            return url.pathname;
          } catch (e) {
            return img;
          }
        }
        return img;
      });
    }
    // If neither new files nor images in body, leave product.images as is!
    
    await product.save();
    console.log('🟢 [UPDATE PRODUCT] Saved product:', product);
    
    const populated = await RecycledProduct.findById(product._id).populate('vendorId ownerUserId', 'name');
    console.log('🟢 [UPDATE PRODUCT] Returning populated product:', populated);
    res.json(formatProduct(req, populated));
  })
);

// Delete product (owner/vendor only)
router.delete(
  '/products/:id',
  protect,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log('🔵 [DELETE PRODUCT] Request params id:', id);
    console.log('🔵 [DELETE PRODUCT] Request user:', req.user);
    
    const product = await RecycledProduct.findById(id);
    if (!product) {
      console.log('🔴 [DELETE PRODUCT] Product NOT found with id:', id);
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('🔵 [DELETE PRODUCT] Found product:', product);
    
    // Check ownership: only owner or vendor can delete
    const isOwner = product.ownerUserId.toString() === req.user._id.toString();
    const isVendor = product.vendorId.toString() === req.user._id.toString();
    console.log('🔵 [DELETE PRODUCT] isOwner:', isOwner, 'isVendor:', isVendor, 'user role:', req.user.role);
    if (!isOwner && !isVendor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    
    const deleted = await RecycledProduct.findByIdAndDelete(id);
    console.log('🟢 [DELETE PRODUCT] Deleted product:', deleted);
    
    res.json({ message: 'Product deleted successfully' });
  })
);

// Public store listings
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    const filter = { status: 'listed', isAvailable: true };
    if (category) filter.category = new RegExp(category, 'i');
    let products = await RecycledProduct.find(filter)
      .populate('vendorId', 'name avatar')
      .populate('ownerUserId', 'name')
      .sort({ createdAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    res.json(products.map((p) => formatProduct(req, p)));
  })
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const p = await RecycledProduct.findById(req.params.id)
      .populate('vendorId', 'name avatar')
      .populate('ownerUserId', 'name');
    if (!p) return res.status(404).json({ message: 'Product not found' });
    res.json(formatProduct(req, p));
  })
);

// Get vendor's products (public endpoint)
router.get(
  '/vendor/:vendorId/products',
  asyncHandler(async (req, res) => {
    const products = await RecycledProduct.find({ 
      vendorId: req.params.vendorId,
      status: 'listed',
      isAvailable: true
    })
      .populate('vendorId ownerUserId', 'name')
      .populate({ path: 'requestId', model: 'RecyclingRequest', select: 'recyclingCompletedAt' })
      .sort({ createdAt: -1 });
    
    const productsWithRequest = products.map(p => ({
      ...p._doc,
      recyclingRequest: p.requestId
    }));
    
    res.json(productsWithRequest.map((p) => formatProduct(req, p)));
  })
);

router.get(
  '/my-products',
  protect,
  asyncHandler(async (req, res) => {
    const filter =
      req.user.role === 'vendor'
        ? { vendorId: req.user._id }
        : { ownerUserId: req.user._id };
    const products = await RecycledProduct.find(filter)
      .populate('vendorId ownerUserId', 'name')
      .populate({ path: 'requestId', model: 'RecyclingRequest', select: 'recyclingCompletedAt' })
      .sort({ createdAt: -1 });
    
    // Map requestId (populated) to recyclingRequest for formatProduct
    const productsWithRequest = products.map(p => ({
      ...p._doc,
      recyclingRequest: p.requestId
    }));
    
    res.json(productsWithRequest.map((p) => formatProduct(req, p)));
  })
);

router.get(
  '/awaiting-choice',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const products = await RecycledProduct.find({
      ownerUserId: req.user._id,
      status: 'awaiting_choice',
    })
      .populate('vendorId', 'name')
      .populate({ path: 'requestId', model: 'RecyclingRequest', select: 'recyclingCompletedAt' });
    
    const productsWithRequest = products.map(p => ({
      ...p._doc,
      recyclingRequest: p.requestId
    }));
    
    res.json(productsWithRequest.map((p) => formatProduct(req, p)));
  })
);

// Create Stripe Payment Intent for Order
router.post(
  '/create-payment-intent',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    console.log('🔍 [Backend] /create-payment-intent called');
    try {
      const { productId, shippingAddress } = req.body;
      console.log('🔍 [Backend] Request body:', { productId, shippingAddress: shippingAddress?.substring(0, 30) + '...' });

      const product = await RecycledProduct.findById(productId);
      console.log('🔍 [Backend] Found product:', product?._id);
      if (!product || product.status !== 'listed') {
        return res.status(400).json({ message: 'Product not available' });
      }
      if (product.ownerUserId.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot buy your own product' });
      }

      const amountInCents = Math.round(product.price * 100);
      console.log('🔍 [Backend] Creating payment intent for amount:', amountInCents, 'cents');
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: req.user._id.toString(),
          productId: productId.toString(),
          shippingAddress: shippingAddress || '',
          type: 'ecommerce_order'
        },
      });

      console.log('✅ [Backend] Created payment intent:', paymentIntent.id);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (stripeErr) {
      console.error('❌ [Backend] Stripe error:', stripeErr);
      res.status(500).json({ 
        message: 'Failed to create payment intent', 
        error: stripeErr.message 
      });
    }
  })
);

// Confirm Stripe Payment and Complete Order
router.post(
  '/confirm-payment',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    console.log('🔍 [Backend] /confirm-payment called');
    try {
      const { productId, paymentIntentId, shippingAddress } = req.body;
      console.log('🔍 [Backend] Request body:', { productId, paymentIntentId });

      if (!paymentIntentId || !productId) {
        return res.status(400).json({ message: 'Payment intent ID and product ID are required' });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log('🔍 [Backend] Payment intent status:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        const product = await RecycledProduct.findById(productId);
        if (!product || product.status !== 'listed') {
          return res.status(400).json({ message: 'Product not available' });
        }

        const order = await completeStripePurchase({
          product,
          buyer: req.user,
          shippingAddress: shippingAddress || '',
          stripePaymentIntentId: paymentIntentId,
        });

        console.log('✅ [Backend] Order created:', order._id);
        res.status(201).json(order);
      } else {
        res.status(400).json({ 
          message: 'Payment not yet completed', 
          status: paymentIntent.status 
        });
      }
    } catch (stripeErr) {
      console.error('❌ [Backend] Stripe error:', stripeErr);
      res.status(500).json({ 
        message: 'Failed to confirm payment', 
        error: stripeErr.message 
      });
    }
  })
);

// Purchase product
router.post(
  '/purchase',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const { productId, paymentMethod, shippingAddress } = req.body;
    if (!['wallet', 'cod', 'stripe'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const product = await RecycledProduct.findById(productId);
    if (!product || product.status !== 'listed') {
      return res.status(400).json({ message: 'Product not available' });
    }
    if (product.ownerUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot buy your own product' });
    }

    const order = await processStorePurchase({
      product,
      buyer: req.user,
      paymentMethod,
      shippingAddress: shippingAddress || '',
    });

    res.status(201).json(order);
  })
);

// Create Stripe Checkout Session for Order
router.post(
  '/create-checkout-session',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    console.log('🔍 [Backend] /create-checkout-session called');
    try {
      const { productId, shippingAddress } = req.body;
      console.log('🔍 [Backend] Request data:', { productId, shippingAddress: shippingAddress?.substring(0, 40) + '...' });

      const product = await RecycledProduct.findById(productId);
      console.log('🔍 [Backend] Product found:', product?._id, product?.title, product?.price);
      
      if (!product || product.status !== 'listed') {
        return res.status(400).json({ message: 'Product not available' });
      }
      if (product.ownerUserId.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot buy your own product' });
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      console.log('🔍 [Backend] Creating Stripe session with clientUrl:', clientUrl);
      
      const productImageUrl = product.images?.[0] 
        ? (product.images[0].startsWith('http') 
            ? product.images[0] 
            : `${req.protocol}://${req.get('host')}${product.images[0]}`) 
        : undefined;
        
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(product.price * 100),
            product_data: { 
              name: product.title, 
              ...(productImageUrl && { images: [productImageUrl] }),
            },
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${clientUrl}/store/${productId}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/store/${productId}`,
        metadata: {
          userId: req.user._id.toString(),
          productId: productId.toString(),
          shippingAddress: shippingAddress || '',
        },
      });
      
      console.log('✅ [Backend] Stripe checkout session created - FULL OBJECT:', JSON.stringify(session, null, 2));
      console.log('✅ [Backend] Session URL:', session.url);
      res.json({ sessionId: session.id, url: session.url });
    } catch (stripeErr) {
      console.error('❌ [Backend] Stripe error creating session:', stripeErr);
      res.status(500).json({ message: 'Failed to create checkout session', error: stripeErr.message });
    }
  })
);

// Confirm Stripe Checkout Session and Complete Order
router.post(
  '/confirm-checkout-session',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    console.log('🔍 [Backend] /confirm-checkout-session called');
    try {
      const { sessionId } = req.body;
      console.log('🔍 [Backend] Session ID:', sessionId);
      
      if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('🔍 [Backend] Stripe session payment status:', session.payment_status);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: 'Payment not completed' });
      }
      
      const productId = session.metadata.productId;
      const product = await RecycledProduct.findById(productId);
      
      if (!product || product.status !== 'listed') {
        return res.status(400).json({ message: 'Product not available' });
      }
      
      const order = await completeStripePurchase({
        product,
        buyer: req.user,
        shippingAddress: session.metadata.shippingAddress || '',
        stripePaymentIntentId: session.payment_intent,
      });
      
      console.log('✅ [Backend] Order created successfully:', order._id);
      res.status(201).json(order);
    } catch (err) {
      console.error('❌ [Backend] Error confirming checkout:', err);
      res.status(500).json({ message: 'Failed to confirm checkout session', error: err.message });
    }
  })
);

export default router;
