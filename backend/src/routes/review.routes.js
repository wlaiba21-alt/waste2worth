import { Router } from 'express';
import Review from '../models/Review.js';
import RecyclingRequest from '../models/RecyclingRequest.js';
import StoreOrder from '../models/StoreOrder.js';
import VendorProfile from '../models/VendorProfile.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from '../services/notify.js';

const router = Router();

// POST /api/reviews — Submit a new review
router.post(
  '/',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const { vendorId, requestId, orderId, rating, comment } = req.body;

    // Validate all required fields before any DB queries
    if (!vendorId) {
      return res.status(400).json({ message: 'vendorId is required' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (!requestId && !orderId) {
      return res.status(400).json({ message: 'Either requestId or orderId is required' });
    }

    // Check if review already exists for this specific transaction
    // Root Cause Fix: Uniqueness should be based on userId + requestId OR userId + orderId
    // (not including vendorId, since multiple orders from same vendor should be reviewable separately)
    let existingReview = null;
    if (requestId) {
      existingReview = await Review.findOne({ userId: req.user._id, requestId: requestId });
    } else if (orderId) {
      existingReview = await Review.findOne({ userId: req.user._id, orderId: orderId });
    }
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this transaction' });
    }

    // Verify ownership before allowing the review
    if (requestId) {
      const request = await RecyclingRequest.findById(requestId);
      // Guard against null before calling .toString() — this was the original crash point
      if (!request) {
        return res.status(404).json({ message: 'Recycling request not found' });
      }
      // Use Mongoose .equals() for safe ObjectId comparison (avoids .toString() on undefined)
      if (!request.userId || !request.userId.equals(req.user._id)) {
        return res.status(403).json({ message: 'Invalid or unauthorized request' });
      }
      if (!['completed', 'product_sold', 'product_returned'].includes(request.status)) {
        return res.status(400).json({ message: 'Can only review completed requests' });
      }
    } else {
      // ROOT CAUSE FIX: StoreOrder schema uses 'buyerId', NOT 'userId'
      // Original code: order.userId.toString() → TypeError because 'userId' is undefined on StoreOrder
      const order = await StoreOrder.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      // buyerId is the correct field — use .equals() for safe comparison
      if (!order.buyerId || !order.buyerId.equals(req.user._id)) {
        return res.status(403).json({ message: 'Invalid or unauthorized order' });
      }
      if (order.orderStatus !== 'delivered') {
        return res.status(400).json({ message: 'Can only review delivered orders' });
      }
    }

    const review = await Review.create({
      userId: req.user._id,
      vendorId,
      requestId: requestId || null,
      orderId: orderId || null,
      productId: req.body.productId || null,
      rating,
      comment: comment || '',
    });

    // Recalculate and update vendor average rating
    const allReviews = await Review.find({ vendorId });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await VendorProfile.findOneAndUpdate(
      { userId: vendorId },
      { rating: Math.round(avg * 10) / 10, reviewCount: allReviews.length }
    );

    // Notify the vendor — guard comment with || '' to avoid crash if comment is undefined
    const safeComment = comment || '';
    await createNotification(vendorId, {
      type: 'info',
      title: 'New Review',
      message: `${req.user.name} left a ${rating}-star review: "${safeComment.slice(0, 50)}${safeComment.length > 50 ? '…' : ''}"`,
      link: '/vendor/dashboard/reviews',
    });

    res.status(201).json(review);
  })
);

// GET /api/reviews/vendor/:vendorId — Get all reviews for a vendor
router.get(
  '/vendor/:vendorId',
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ vendorId: req.params.vendorId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(
      reviews.map((r) => ({
        id: r._id.toString(),
        user: r.userId?.name || 'User',
        userAvatar: r.userId?.avatar,
        rating: r.rating,
        comment: r.comment,
        vendorReply: r.vendorReply || '',
        repliedAt: r.repliedAt,
        date: r.createdAt,
      }))
    );
  })
);

// GET /api/reviews/product/:productId — Get all reviews for a product
router.get(
  '/product/:productId',
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(
      reviews.map((r) => ({
        id: r._id.toString(),
        user: r.userId?.name || 'User',
        userAvatar: r.userId?.avatar,
        rating: r.rating,
        comment: r.comment,
        vendorReply: r.vendorReply || '',
        repliedAt: r.repliedAt,
        date: r.createdAt,
      }))
    );
  })
);

// PATCH /api/reviews/:id/reply — Vendor replies to a review
router.patch(
  '/:id/reply',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const { reply } = req.body;
    if (!reply?.trim()) return res.status(400).json({ message: 'Reply text is required' });

    const review = await Review.findById(req.params.id).populate('userId', 'name');
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Use .equals() for safe ObjectId comparison
    if (!review.vendorId || !review.vendorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to reply to this review' });
    }

    review.vendorReply = reply.trim();
    review.repliedAt = new Date();
    await review.save();

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });
    await createNotification(review.userId, {
      type: 'info',
      title: 'Vendor replied to your review',
      message: `${vendorProfile?.businessName || req.user.name} replied: "${reply.trim().slice(0, 80)}${reply.length > 80 ? '…' : ''}"`,
      link: '/dashboard/reviews',
    });

    res.json({
      id: review._id.toString(),
      user: review.userId?.name || 'User',
      rating: review.rating,
      comment: review.comment,
      vendorReply: review.vendorReply,
      repliedAt: review.repliedAt,
      date: review.createdAt,
    });
  })
);

// PATCH /api/reviews/:id — User edits their own review
router.patch(
  '/:id',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Use .equals() for safe ObjectId comparison
    if (!review.userId || !review.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to edit this review' });
    }

    review.rating = rating || review.rating;
    review.comment = comment !== undefined ? comment : review.comment;
    await review.save();

    // Recalculate vendor average rating
    const allReviews = await Review.find({ vendorId: review.vendorId });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await VendorProfile.findOneAndUpdate(
      { userId: review.vendorId },
      { rating: Math.round(avg * 10) / 10 }
    );

    res.json(review);
  })
);

// GET /api/reviews/pending — Get pending reviews for the logged-in user
router.get(
  '/pending',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    // Get completed recycling requests for this user
    const completedRequests = await RecyclingRequest.find({
      userId: req.user._id,
      $or: [
        { status: 'completed' },
        { status: 'product_sold' },
        { status: 'product_returned' },
      ],
      vendorId: { $ne: null },
    }).populate('vendorId', 'name');

    // ROOT CAUSE FIX: StoreOrder uses 'buyerId' NOT 'userId'
    // Original code queried { userId: req.user._id } which always returned [] because the field doesn't exist
    // Also populate productId so we can read product.title for the category label
    const deliveredOrders = await StoreOrder.find({
      buyerId: req.user._id,   // FIXED: was 'userId'
      orderStatus: 'delivered',
    })
      .populate('vendorId', 'name')
      .populate('productId', 'title'); // FIXED: needed to read o.productId.title

    // Find what has already been reviewed
    const reviewedRequests = await Review.find({
      userId: req.user._id,
      requestId: { $ne: null },
    }).select('requestId');
    const reviewedOrders = await Review.find({
      userId: req.user._id,
      orderId: { $ne: null },
    }).select('orderId');

    const reviewedRequestIds = new Set(reviewedRequests.map((r) => r.requestId?.toString()).filter(Boolean));
    const reviewedOrderIds = new Set(reviewedOrders.map((r) => r.orderId?.toString()).filter(Boolean));

    // Filter out already-reviewed items
    const pendingRequests = completedRequests.filter((r) => !reviewedRequestIds.has(r._id.toString()));
    const pendingOrders = deliveredOrders.filter((o) => !reviewedOrderIds.has(o._id.toString()));

    // Fetch vendor business names
    const vendorIds = [
      ...new Set(pendingRequests.map((r) => r.vendorId?._id?.toString()).filter(Boolean)),
      // FIXED: vendorId is now populated, so safely read ._id or fall back to .toString()
      ...new Set(pendingOrders.map((o) => o.vendorId?._id?.toString() || o.vendorId?.toString()).filter(Boolean)),
    ];
    const profiles = await VendorProfile.find({ userId: { $in: vendorIds } });
    const nameByVendor = Object.fromEntries(profiles.map((p) => [p.userId.toString(), p.businessName]));

    const pending = [
      ...pendingRequests.map((r) => ({
        id: r._id.toString(),
        requestId: r._id.toString(),
        vendorId: r.vendorId?._id?.toString() || r.vendorId?.toString(),
        vendorName: nameByVendor[r.vendorId?._id?.toString()] || r.vendorId?.name || 'Vendor',
        date: r.updatedAt || r.createdAt,
        category: r.category,
        type: 'request',
      })),
      ...pendingOrders.map((o) => {
        // FIXED: vendorId is now populated so ._id is available
        const vendorIdStr = o.vendorId?._id?.toString() || o.vendorId?.toString();
        return {
          id: o._id.toString(),
          orderId: o._id.toString(),
          vendorId: vendorIdStr,
          vendorName: nameByVendor[vendorIdStr] || o.vendorId?.name || 'Vendor',
          date: o.updatedAt || o.createdAt,
          // FIXED: productId is now populated so title is readable
          category: o.productId?.title || 'Store Product',
          productId: o.productId?._id?.toString() || o.productId?.toString(), // NEW: include productId for review payload
          type: 'order',
        };
      }),
    ];

    res.json(pending);
  })
);

// GET /api/reviews/my — Get all reviews submitted by the logged-in user
router.get(
  '/my',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ userId: req.user._id }).sort({ createdAt: -1 });
    // Guard with optional chaining to avoid crash on null vendorId
    const vendorIds = [...new Set(reviews.map((r) => r.vendorId?.toString()).filter(Boolean))];
    const profiles = await VendorProfile.find({ userId: { $in: vendorIds } });
    const nameByVendor = Object.fromEntries(profiles.map((p) => [p.userId.toString(), p.businessName]));

    res.json(
      reviews.map((r) => ({
        id: r._id.toString(),
        vendorName: nameByVendor[r.vendorId?.toString()] || 'Vendor',
        rating: r.rating,
        comment: r.comment,
        vendorReply: r.vendorReply || '',
        date: r.createdAt,
      }))
    );
  })
);

export default router;
