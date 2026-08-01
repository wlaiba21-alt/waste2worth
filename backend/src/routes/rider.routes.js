import { Router } from 'express';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import RecyclingRequest from '../models/RecyclingRequest.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upload, setUploadFolder } from '../middleware/upload.js';

const router = Router();

// Helper to get rider display status
const getRiderDisplayStatus = (rider, hasAssignedTasks) => {
  if (rider.status === 'suspended') return 'inactive';
  if (hasAssignedTasks) return 'busy';
  const status = rider.availabilityStatus || 'active';
  if (status === 'available') return 'active';
  return status;
};

// GET /api/rider/list
// Fetch rider list for Admin and Vendor views (must be before authorize rider role middleware)
router.get(
  '/list',
  protect,
  authorize('admin', 'vendor'),
  asyncHandler(async (req, res) => {
    const riderProfiles = await RiderProfile.find().populate('userId', 'name email phone avatar status createdAt');
    const riderIds = riderProfiles.filter(p => p.userId).map(p => p.userId._id.toString());
    const assignedRequests = await RecyclingRequest.find({
      riderId: { $in: riderIds },
      status: { $in: ['rider_assigned', 'rider_on_pickup', 'rider_picked_up', 'return_rider_assigned', 'return_on_way'] }
    });

    const ridersWithStatus = riderProfiles.map(profile => {
      if (!profile.userId) return null;
      const user = profile.userId.toObject();
      const hasAssignedTasks = assignedRequests.some(r => r.riderId.toString() === user._id.toString());
      const displayStatus = getRiderDisplayStatus(
        { status: user.status, availabilityStatus: profile.availabilityStatus },
        hasAssignedTasks
      );
      return {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        riderProfileId: profile._id,
        availabilityStatus: profile.availabilityStatus,
        displayStatus,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      };
    }).filter(Boolean);

    res.json(ridersWithStatus);
  })
);

// Protect all other routes for rider role only
router.use(protect, authorize('rider'));

// GET /tasks (unified endpoint for both recycling pickups and store deliveries)
// Returns a single merged list of all tasks assigned to the logged-in rider.
// This includes both recycling pickup tasks and store delivery orders.
// Each task is marked with a 'type' field so the frontend can render them appropriately.
router.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    // Import StoreOrder model here to avoid circular dependencies
    const { default: StoreOrder } = await import('../models/StoreOrder.js');

    // Fetch recycling pickup tasks assigned to the logged-in rider
    // Query for requests where riderId matches the logged-in rider and status is in active pickup states
    const pickupTasks = await RecyclingRequest.find({
      riderId: req.user._id,
      status: { $in: ['rider_assigned', 'rider_on_pickup', 'rider_picked_up', 'return_rider_assigned', 'return_on_way'] }
    })
      .populate('userId', 'name email')
      .populate('vendorId', 'name email')
      .sort({ createdAt: -1 });

    // Fetch store delivery orders assigned to the logged-in rider
    // Query for orders where riderId matches the logged-in rider and orderStatus is in active delivery states
    const deliveryOrders = await StoreOrder.find({
      riderId: req.user._id,
      orderStatus: { $in: ['rider_assigned', 'out_for_delivery'] }
    })
      .populate('productId', 'title images category')
      .populate('buyerId', 'name email')
      .populate('vendorId', 'name email')
      .populate('riderId', 'name email')
      .sort({ createdAt: -1 });

    // Merge both task types into a single array for unified display
    // Each task includes a 'type' field to distinguish between 'pickup' and 'delivery' tasks
    const allTasks = [
      ...pickupTasks.map(task => ({
        type: 'pickup',
        id: task._id.toString(),
        _id: task._id,
        ...task.toObject()
      })),
      ...deliveryOrders.map(order => ({
        type: 'delivery',
        id: order._id.toString(),
        _id: order._id,
        ...order.toObject()
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allTasks);
  })
);

// GET /profile
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const riderProfile = await RiderProfile.findOne({ userId: req.user._id });
    const assignedRequests = await RecyclingRequest.countDocuments({
      riderId: req.user._id,
      status: { $in: ['rider_assigned', 'rider_on_pickup', 'rider_picked_up', 'return_rider_assigned', 'return_on_way'] }
    });

    const displayStatus = getRiderDisplayStatus(
      { status: req.user.status, availabilityStatus: riderProfile?.availabilityStatus },
      assignedRequests > 0
    );

    res.json({
      ...req.user.toPublic(),
      riderProfileId: riderProfile?._id,
      availabilityStatus: riderProfile?.availabilityStatus || 'active',
      displayStatus
    });
  })
);

// PATCH /profile
router.patch(
  '/profile',
  setUploadFolder('avatars'),
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    const { name, phone, password } = req.body;

    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      req.user.password = password;
    }
    if (req.file) {
      req.user.avatar = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    }

    await req.user.save();

    const riderProfile = await RiderProfile.findOne({ userId: req.user._id });
    const assignedRequests = await RecyclingRequest.countDocuments({
      riderId: req.user._id,
      status: { $in: ['rider_assigned', 'rider_on_pickup', 'rider_picked_up', 'return_rider_assigned', 'return_on_way'] }
    });

    const displayStatus = getRiderDisplayStatus(
      { status: req.user.status, availabilityStatus: riderProfile?.availabilityStatus },
      assignedRequests > 0
    );

    const responseData = {
      ...req.user.toPublic(),
      riderProfileId: riderProfile?._id,
      availabilityStatus: riderProfile?.availabilityStatus || 'active',
      displayStatus
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('rider_profile_updated', responseData);
    }

    res.json(responseData);
  })
);

// PATCH /availability
router.patch(
  '/availability',
  asyncHandler(async (req, res) => {
    const { availabilityStatus } = req.body;

    if (!availabilityStatus) {
      return res.status(400).json({ message: 'availabilityStatus is required' });
    }

    const validStatuses = ['active', 'inactive', 'busy', 'available'];
    if (!validStatuses.includes(availabilityStatus.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid availabilityStatus' });
    }

    let riderProfile = await RiderProfile.findOne({ userId: req.user._id });
    if (!riderProfile) {
      riderProfile = await RiderProfile.create({ userId: req.user._id, availabilityStatus: availabilityStatus.toLowerCase() });
    } else {
      riderProfile.availabilityStatus = availabilityStatus.toLowerCase();
      await riderProfile.save();
    }

    const assignedRequests = await RecyclingRequest.countDocuments({
      riderId: req.user._id,
      status: { $in: ['rider_assigned', 'rider_on_pickup', 'rider_picked_up', 'return_rider_assigned', 'return_on_way'] }
    });

    const displayStatus = getRiderDisplayStatus(
      { status: req.user.status, availabilityStatus: riderProfile.availabilityStatus },
      assignedRequests > 0
    );

    const responseData = {
      ...req.user.toPublic(),
      riderProfileId: riderProfile._id,
      availabilityStatus: riderProfile.availabilityStatus,
      displayStatus
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('rider_status_changed', {
        riderId: req.user._id.toString(),
        availabilityStatus: riderProfile.availabilityStatus,
        displayStatus
      });
    }

    res.json(responseData);
  })
);

export default router;
