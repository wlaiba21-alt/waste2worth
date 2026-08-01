import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import RiderProfile from '../models/RiderProfile.js';
import RecyclingRequest from '../models/RecyclingRequest.js';
import StoreOrder from '../models/StoreOrder.js';
import RecycledProduct from '../models/RecycledProduct.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(protect, authorize('admin'));

// Format request like request.routes.js does
function formatRequest(req, doc) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    id: doc._id.toString(),
    _id: doc._id,
    userId: doc.userId?._id?.toString() || doc.userId?.toString(),
    vendorId: doc.vendorId?._id?.toString() || doc.vendorId?.toString(),
    riderId: doc.riderId?._id?.toString() || doc.riderId?.toString(),
    category: doc.category,
    quantity: doc.quantity,
    image: doc.image?.startsWith('http') ? doc.image : doc.image ? `${base}${doc.image}` : '',
    address: doc.address,
    pickupDate: doc.pickupDate,
    status: doc.status,
    notes: doc.notes,
    estimatedReward: doc.estimatedReward,
    recycledProductId: doc.recycledProductId,
    createdAt: doc.createdAt,
    recyclingStartedAt: doc.recyclingStartedAt,
    estimatedCompletionDays: doc.estimatedCompletionDays,
    recyclingCompletedAt: doc.recyclingCompletedAt,
    returnAddress: doc.returnAddress,
    returnRejectionReason: doc.returnRejectionReason,
    riderAssignedAt: doc.riderAssignedAt,
    riderOnPickupAt: doc.riderOnPickupAt,
    riderPickedUpAt: doc.riderPickedUpAt,
    wasteReceivedAt: doc.wasteReceivedAt,
    returnRiderAssignedAt: doc.returnRiderAssignedAt,
    returnOnWayAt: doc.returnOnWayAt,
    productReturnedAt: doc.productReturnedAt,
    user: doc.userId?.name ? { 
      id: doc.userId._id,
      name: doc.userId.name, 
      avatar: doc.userId.avatar,
      email: doc.userId.email
    } : undefined,
    vendor: doc.vendorId?.name ? { 
      id: doc.vendorId._id,
      name: doc.vendorId.name,
      avatar: doc.vendorId.avatar,
      email: doc.vendorId.email 
    } : undefined,
    rider: doc.riderId?.name ? { 
      id: doc.riderId._id,
      name: doc.riderId.name, 
      avatar: doc.riderId.avatar,
      email: doc.riderId.email 
    } : undefined,
  };
}

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [
      users,
      vendors,
      riders,
      requests,
      completedRequests,
      pendingRequests,
      vendorAcceptedRequests,
      adminRejectedRequests,
      vendorRejectedRequests,
      products,
      orders,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      VendorProfile.countDocuments(),
      RiderProfile.countDocuments(),
      RecyclingRequest.countDocuments(),
      RecyclingRequest.countDocuments({ status: { $in: ['recycling_completed', 'product_returned', 'product_sold'] } }),
      RecyclingRequest.countDocuments({ status: 'pending' }),
      RecyclingRequest.countDocuments({ status: 'vendor_accepted' }),
      RecyclingRequest.countDocuments({ status: 'admin_rejected' }),
      RecyclingRequest.countDocuments({ status: 'vendor_rejected' }),
      RecycledProduct.countDocuments(),
      StoreOrder.countDocuments(),
    ]);

    const paidOrders = await StoreOrder.find({ paymentStatus: 'paid' });
    const platformRevenue = paidOrders.reduce((s, o) => s + (o.commission?.admin || 0), 0);

    // For frontend's expected fields
    const acceptedRequests = vendorAcceptedRequests;
    const rejectedRequests = adminRejectedRequests + vendorRejectedRequests;

    res.json({
      users,
      vendors,
      riders,
      requests,
      completedRequests,
      pendingRequests,
      acceptedRequests,
      rejectedRequests,
      listedProducts: products,
      orders,
      platformRevenue,
    });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users.map((u) => u.toPublic()));
  })
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(user.toPublic());
  })
);

router.get(
  '/vendors',
  asyncHandler(async (req, res) => {
    const vendors = await VendorProfile.find().populate('userId', 'name email avatar status');
    res.json(vendors);
  })
);

router.get(
  '/riders',
  asyncHandler(async (req, res) => {
    const riders = await RiderProfile.find().populate('userId', 'name email avatar status');
    res.json(riders);
  })
);

router.post(
  '/riders',
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, ...profileData } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({ name, email, password, role: 'rider', phone });
    const riderProfile = await RiderProfile.create({ userId: user._id, ...profileData });
    await riderProfile.populate('userId', 'name email avatar status');
    res.status(201).json(riderProfile);
  })
);

router.delete(
  '/riders/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    console.log(`[DELETE /admin/riders] Attempting to delete id: ${id}`);

    // Try finding by RiderProfile._id first, then by userId
    let riderProfile = await RiderProfile.findById(id).catch(() => null);

    if (!riderProfile) {
      // Maybe the frontend passed the userId instead of the RiderProfile _id
      riderProfile = await RiderProfile.findOne({ userId: id }).catch(() => null);
    }

    if (!riderProfile) {
      console.log(`[DELETE /admin/riders] Not found for id: ${id}`);
      // Log all existing rider IDs to help debug
      const allRiders = await RiderProfile.find().select('_id userId');
      console.log('[DELETE /admin/riders] Existing riders:', JSON.stringify(allRiders));
      return res.status(404).json({ message: 'Rider not found' });
    }

    console.log(`[DELETE /admin/riders] Found riderProfile: ${riderProfile._id}, userId: ${riderProfile.userId}`);
    // Delete associated user account and rider profile
    await User.findByIdAndDelete(riderProfile.userId);
    await RiderProfile.findByIdAndDelete(riderProfile._id);
    res.json({ message: 'Rider deleted successfully' });
  })
);


router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const requests = await RecyclingRequest.find()
      .populate('userId', 'name email avatar')
      .populate('vendorId', 'name email avatar')
      .populate('riderId', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(requests.map(r => formatRequest(req, r)));
  })
);

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const products = await RecycledProduct.find()
      .populate('vendorId', 'name email')
      .populate('ownerUserId', 'name email')
      .sort({ createdAt: -1 });

    const productsWithVendorProfile = await Promise.all(
      products.map(async (product) => {
        const vendorProfile = await VendorProfile.findOne({ userId: product.vendorId });
        const productObj = product.toObject();
        productObj.vendorProfile = vendorProfile;
        return productObj;
      })
    );

    res.json(productsWithVendorProfile);
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const orders = await StoreOrder.find()
      .populate('buyerId', 'name email')
      .populate('vendorId', 'name email')
      .populate('riderId', 'name email')
      .populate('productId', 'title description images')
      .sort({ createdAt: -1 });
    
    // Map to orderApi expected format
    const mappedOrders = orders.map(order => ({
      id: order._id,
      ...order.toObject(),
      buyer: order.buyerId,
      vendor: order.vendorId,
      rider: order.riderId,
      product: order.productId,
      amount: order.amount,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
    }));
    
    res.json(mappedOrders);
  })
);

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const requests = await RecyclingRequest.find();
    const byCategory = {};
    requests.forEach((r) => {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    });
    const wasteByCategory = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

    const orders = await StoreOrder.find({ paymentStatus: 'paid' });
    const monthlyMap = {};
    orders.forEach((o) => {
      const m = new Date(o.createdAt).toLocaleString('en', { month: 'short' });
      monthlyMap[m] = (monthlyMap[m] || 0) + o.amount;
    });
    const monthlyEarnings = Object.entries(monthlyMap).map(([name, revenue]) => ({ name, revenue }));

    const statusCounts = {};
    requests.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    const requestsByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const userGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const count = await User.countDocuments({
        role: 'user',
        createdAt: { $lte: d },
      });
      userGrowth.push({ name: d.toLocaleString('en', { month: 'short' }), users: count });
    }

    res.json({ wasteByCategory, monthlyEarnings, requestsByStatus, userGrowth });
  })
);

export default router;
