import { Router } from 'express';
import RecyclingRequest from '../models/RecyclingRequest.js';
import VendorProfile from '../models/VendorProfile.js';
import RiderProfile from '../models/RiderProfile.js';
import User from '../models/User.js';
import RecycledProduct from '../models/RecycledProduct.js';
import Transaction from '../models/Transaction.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upload, setUploadFolder } from '../middleware/upload.js';
import { createNotification, createMultipleNotifications } from '../services/notify.js';
import { emitToUsers, emitToAll } from '../sockets/notification.socket.js';
import { creditWallet, debitWallet } from '../services/wallet.js';

const router = Router();

// Helper to get admin IDs
async function getAdminIds() {
  const admins = await User.find({ role: 'admin' }).select('_id');
  return admins.map(a => a._id.toString());
}

// Emit socket event for request status changes
function emitRequestUpdate(req, doc) {
  const io = req.app.get('io');
  if (io) {
    const eventData = {
      requestId: doc._id.toString(),
      status: doc.status,
      userId: doc.userId?.toString(),
      vendorId: doc.vendorId?.toString(),
      riderId: doc.riderId?.toString() || null,
    };
    // Map status to the requested event names
    let eventName = doc.status;
    if (doc.status === 'return_requested') eventName = 'return_requested';
    else if (doc.status === 'return_approved') eventName = 'return_approved';
    else if (doc.status === 'rider_assigned' || doc.status === 'return_rider_assigned') eventName = 'rider_assigned';
    else if (doc.status === 'rider_on_pickup') eventName = 'pickup_started';
    else if (doc.status === 'return_on_way') eventName = 'out_for_delivery';
    else if (doc.status === 'rider_picked_up') eventName = 'picked_up';
    else if (doc.status === 'waste_received' || doc.status === 'product_returned') eventName = 'delivered';
    
    io.emit('request_status_changed', eventData);
    io.emit(eventName, eventData);
  }
}

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
    finalReward: doc.finalReward,
    postRecyclingChoice: doc.postRecyclingChoice,
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

// Step 1: User submits request
router.post(
  '/',
  protect,
  authorize('user'),
  setUploadFolder('requests'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { vendorId, category, quantity, address, pickupDate, notes } = req.body;
    
    // Backend validation
    const errors = {};
    if (!vendorId) errors.vendorId = 'Vendor is required';
    if (!category) errors.category = 'Category is required';
    if (!quantity || !quantity.trim()) errors.quantity = 'Quantity is required';
    if (!address || !address.trim()) errors.address = 'Pickup address is required';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fill in all required fields', errors });
    }

    const image = req.file
      ? `/uploads/requests/${req.file.filename}`
      : req.body.image || '';
    const reward = parseFloat(req.body.estimatedReward) || Math.random() * 20 + 5;

    const request = await RecyclingRequest.create({
      userId: req.user._id,
      vendorId,
      category,
      quantity,
      image,
      address,
      pickupDate: pickupDate ? new Date(pickupDate) : undefined,
      notes: notes || '',
      estimatedReward: Math.round(reward * 100) / 100,
      status: 'pending'
    });

    // Get admin IDs to notify
    const admins = await User.find({ role: 'admin' }).select('_id');
    const adminIds = admins.map(a => a._id);
    
    // Notify vendor and all admins
    await createNotification(vendorId, {
      type: 'info',
      title: 'New Recycling Request',
      message: `${req.user.name} submitted a ${category} request (${quantity}).`,
      link: '/vendor/dashboard/requests',
    });
    
    await createMultipleNotifications(adminIds, {
      type: 'info',
      title: 'New Recycling Request',
      message: `New ${category} request submitted by ${req.user.name} to ${(await User.findById(vendorId)).name}.`,
      link: '/admin/dashboard/requests',
    });

    const populated = await RecyclingRequest.findById(request._id).populate('userId vendorId', 'name avatar email');
    emitRequestUpdate(req, request);
    res.status(201).json(formatRequest(req, populated));
  })
);

// Get user's requests
router.get(
  '/my',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const list = await RecyclingRequest.find({ userId: req.user._id })
      .populate('vendorId riderId', 'name avatar email')
      .sort({ createdAt: -1 });
    res.json(list.map((d) => formatRequest(req, d)));
  })
);

// Get vendor's incoming requests
router.get(
  '/incoming',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const list = await RecyclingRequest.find({ vendorId: req.user._id })
      .populate('userId riderId', 'name avatar email')
      .sort({ createdAt: -1 });
    res.json(list.map((d) => formatRequest(req, d)));
  })
);

// Get all requests (admin)
router.get(
  '/all',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const list = await RecyclingRequest.find()
      .populate('userId vendorId riderId', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(list.map((d) => formatRequest(req, d)));
  })
);

// Step 2: Vendor accepts or rejects request
router.patch(
  '/:id/vendor-action',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const { action } = req.body; // 'accept' or 'reject'
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.vendorId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });

    if (action === 'accept') {
      doc.status = 'vendor_accepted';
      // Notify admin
      const admins = await User.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map(a => a._id);
      await createMultipleNotifications(adminIds, {
        type: 'info',
        title: 'Request Awaiting Approval',
        message: `${req.user.name} accepted ${doc.category} request from ${(await User.findById(doc.userId)).name}.`,
        link: '/admin/dashboard/requests',
      });
      // Notify user
      await createNotification(doc.userId, {
        type: 'info',
        title: 'Vendor Accepted Request',
        message: 'Your recycling request has been accepted and sent to admin for approval.',
        link: '/dashboard/requests',
      });
    } else if (action === 'reject') {
      doc.status = 'vendor_rejected';
      await createNotification(doc.userId, {
        type: 'warning',
        title: 'Request Declined',
        message: 'Your recycling request was declined by the vendor.',
        link: '/dashboard/requests',
      });
    }

    await doc.save();
    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name avatar email');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Step 3: Admin approves or rejects vendor accepted request
router.patch(
  '/:id/admin-action',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });

    if (action === 'approve') {
      doc.status = 'admin_approved';
      await createNotification(doc.vendorId, {
        type: 'success',
        title: 'Request Approved',
        message: 'Recycling request approved by admin. You can now assign a rider.',
        link: '/vendor/dashboard/requests',
      });
      await createNotification(doc.userId, {
        type: 'success',
        title: 'Request Approved',
        message: 'Your recycling request has been approved!',
        link: '/dashboard/requests',
      });
    } else if (action === 'reject') {
      doc.status = 'admin_rejected';
      await createNotification(doc.vendorId, {
        type: 'warning',
        title: 'Request Rejected',
        message: 'Your acceptance of the recycling request was rejected by admin.',
        link: '/vendor/dashboard/requests',
      });
      await createNotification(doc.userId, {
        type: 'warning',
        title: 'Request Rejected',
        message: 'Your recycling request was rejected by admin.',
        link: '/dashboard/requests',
      });
    }

    await doc.save();
    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Step 4: Vendor assigns rider
router.patch(
  '/:id/assign-rider',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const { riderId } = req.body;
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.vendorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    doc.riderId = riderId;
    doc.status = 'rider_assigned';
    doc.riderAssignedAt = new Date();
    await doc.save();

    // Update rider profile
    const riderProfile = await RiderProfile.findOne({ userId: riderId });
    if (riderProfile) {
      riderProfile.availabilityStatus = 'assigned';
      await riderProfile.save();
    }

    // Notify rider and user
    await createNotification(riderId, {
      type: 'info',
      title: 'New Pickup Assignment',
      message: `You've been assigned a new ${doc.category} pickup request!`,
      link: '/rider/dashboard',
    });
    await createNotification(doc.userId, {
      type: 'info',
      title: 'Rider Assigned',
      message: `A rider has been assigned to pick up your recycling.`,
      link: '/dashboard/requests',
    });

    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Step 4/5: Rider updates pickup status
router.patch(
  '/:id/rider-pickup-status',
  protect,
  authorize('rider'),
  asyncHandler(async (req, res) => {
    const { status } = req.body; // 'rider_on_pickup', 'rider_picked_up', 'waste_received'
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.riderId?.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });

    const riderProfile = await RiderProfile.findOne({ userId: req.user._id });

    if (status === 'rider_on_pickup') {
      doc.status = 'rider_on_pickup';
      doc.riderOnPickupAt = new Date();
      if (riderProfile) {
        riderProfile.availabilityStatus = 'on_pickup';
        await riderProfile.save();
      }
      await createNotification(doc.userId, {
        type: 'info',
        title: 'Rider On the Way',
        message: 'Your rider is on the way to pick up your recycling!',
        link: '/dashboard/requests',
      });
    } else if (status === 'rider_picked_up') {
      doc.status = 'rider_picked_up';
      doc.riderPickedUpAt = new Date();
      if (riderProfile) {
        riderProfile.availabilityStatus = 'picked_up';
        await riderProfile.save();
      }
      await createNotification(doc.userId, {
        type: 'info',
        title: 'Waste Picked Up',
        message: 'Your recyclable waste has been picked up by the rider!',
        link: '/dashboard/requests',
      });
      await createNotification(doc.vendorId, {
        type: 'info',
        title: 'Waste On the Way',
        message: 'Rider has picked up the recycling and is on the way to you!',
        link: '/vendor/dashboard/requests',
      });
    } else if (status === 'waste_received') {
      doc.status = 'waste_received';
      doc.wasteReceivedAt = new Date();
      if (riderProfile) {
        riderProfile.availabilityStatus = 'available'; // Rider is now free
        riderProfile.completedTasks = (riderProfile.completedTasks || 0) + 1;
        await riderProfile.save();
      }
      if (doc.riderId) {
        await creditWallet(doc.riderId, 50, 'rider_fee', 'Earned fee for waste pickup delivery', { orderId: doc._id });
      }
      await createNotification(doc.userId, {
        type: 'success',
        title: 'Waste Delivered',
        message: 'Your recyclable waste has been delivered to the vendor!',
        link: '/dashboard/requests',
      });
      await createNotification(doc.vendorId, {
        type: 'success',
        title: 'Waste Received',
        message: 'Recycling waste has been delivered to your facility!',
        link: '/vendor/dashboard/requests',
      });
    }

    await doc.save();

    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Step 6/7: Vendor updates recycling progress
router.patch(
  '/:id/recycling-progress',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const { action, estimatedCompletionDays } = req.body; // 'start', 'complete'
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.vendorId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });

    if (action === 'start') {
      doc.status = 'recycling_started';
      doc.recyclingStartedAt = new Date();
      doc.estimatedCompletionDays = estimatedCompletionDays;
      await createNotification(doc.userId, {
        type: 'info',
        title: 'Recycling Started',
        message: `Recycling has started! Estimated completion in ${estimatedCompletionDays} days.`,
        link: '/dashboard/requests',
      });
    } else if (action === 'complete') {
      doc.status = 'recycling_completed';
      doc.recyclingCompletedAt = new Date();
      await createNotification(doc.userId, {
        type: 'success',
        title: 'Recycling Complete!',
        message: 'Your recyclables have been processed! Please choose to get your product back or sell it.',
        link: '/dashboard/requests',
      });
    }

    await doc.save();
    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Step 8: User chooses get product back or sell
router.patch(
  '/:id/post-recycling-choice',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const { choice, returnAddress } = req.body; // 'return' or 'sell'
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });

    const adminIds = await getAdminIds();
    doc.postRecyclingChoice = choice; // Set user's choice
    
    if (choice === 'return') {
      doc.status = 'return_requested';
      doc.returnAddress = returnAddress;

      // Apply service charges if they exist
      const productValue = doc.estimatedReward || 0;
      const recyclingExpense = Math.round(productValue * 0.1 * 100) / 100;
      const totalCharge = recyclingExpense;

      if (totalCharge > 0) {
        await debitWallet(doc.userId, totalCharge, 'recycling_service_charge', `Service charge for returning recycled ${doc.category}`, { requestId: doc._id });
        if (recyclingExpense > 0) {
          await creditWallet(doc.vendorId, recyclingExpense, 'recycling_service_charge', `Recycling service fee for ${doc.category}`, { requestId: doc._id });
        }
      }

      await createNotification(doc.vendorId, {
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
    } else if (choice === 'sell') {
      doc.status = 'product_sold';
      const recycledProduct = await RecycledProduct.create({
        requestId: doc._id,
        vendorId: doc.vendorId,
        ownerUserId: doc.userId,
        title: `Recycled ${doc.category}`,
        description: `High-quality recycled ${doc.category} from ${doc.quantity} of waste.`,
        images: doc.image ? [doc.image] : [],
        category: doc.category,
        price: doc.estimatedReward * 1.5,
        status: 'listed'
      });
      doc.recycledProductId = recycledProduct._id;
      
      // finalReward stays 0 — wallet is only credited after the product is
      // actually purchased by a buyer and the order is marked delivered.
      // See creditOrderCommissions() in services/payments.js.
      doc.finalReward = 0;
      
      await createNotification(doc.vendorId, {
        type: 'info',
        title: 'Product Listed for Sale',
        message: 'User chose to sell the recycled product. It is now listed in the marketplace.',
        link: '/vendor/dashboard/requests',
      });
    }

    await doc.save();
    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Step 9: Vendor assigns rider for return
router.patch(
  '/:id/assign-return-rider',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const { riderId } = req.body;
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.vendorId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    if (!['return_requested', 'return_approved'].includes(doc.status)) {
      return res.status(400).json({ message: 'Invalid request status for assigning return rider' });
    }

    doc.riderId = riderId;
    doc.status = 'return_rider_assigned';
    doc.returnRiderAssignedAt = new Date();
    await doc.save();

    const riderProfile = await RiderProfile.findOne({ userId: riderId });
    if (riderProfile) {
      riderProfile.availabilityStatus = 'assigned';
      await riderProfile.save();
    }

    await createNotification(riderId, {
      type: 'info',
      title: 'Return Delivery Assignment',
      message: `You've been assigned a new return delivery!`,
      link: '/rider/dashboard',
    });
    await createNotification(doc.userId, {
      type: 'info',
      title: 'Return Rider Assigned',
      message: `A rider has been assigned to deliver your recycled product.`,
      link: '/dashboard/requests',
    });

    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Step 10: Rider updates return status
router.patch(
  '/:id/rider-return-status',
  protect,
  authorize('rider'),
  asyncHandler(async (req, res) => {
    const { status } = req.body; // 'return_on_way', 'product_returned'
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.riderId?.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });

    const riderProfile = await RiderProfile.findOne({ userId: req.user._id });
    const adminIds = await getAdminIds();

    if (status === 'return_on_way') {
      doc.status = 'return_on_way';
      doc.returnOnWayAt = new Date();
      if (riderProfile) {
        riderProfile.availabilityStatus = 'on_pickup';
        await riderProfile.save();
      }
      await createNotification(doc.userId, {
        type: 'info',
        title: 'Product On the Way',
        message: 'Your recycled product is on the way to you!',
        link: '/dashboard/requests',
      });
      await createNotification(doc.vendorId, {
        type: 'info',
        title: 'Return Delivery Started',
        message: 'Rider is on the way to deliver the recycled product.',
        link: '/vendor/dashboard/requests',
      });
      await createMultipleNotifications(adminIds, {
        type: 'info',
        title: 'Return Delivery Started',
        message: `Rider is on the way to deliver the recycled product to user.`,
        link: '/admin/dashboard/requests',
      });
    } else if (status === 'product_returned') {
      doc.status = 'product_returned';
      doc.productReturnedAt = new Date();
      if (riderProfile) {
        riderProfile.availabilityStatus = 'available';
        riderProfile.completedTasks = (riderProfile.completedTasks || 0) + 1;
        await riderProfile.save();
      }
      if (doc.riderId) {
        await creditWallet(doc.riderId, 50, 'rider_fee', 'Earned fee for return delivery', { orderId: doc._id });
      }
      
      // Return scenario: no wallet credit. The user gets their physical product
      // back with no monetary transaction. finalReward remains 0.
      
      await createNotification(doc.userId, {
        type: 'success',
        title: 'Product Delivered',
        message: 'Your recycled product has been delivered back to you!',
        link: '/dashboard/requests',
      });
      await createNotification(doc.vendorId, {
        type: 'success',
        title: 'Return Delivered',
        message: 'Recycled product has been delivered to the user.',
        link: '/vendor/dashboard/requests',
      });
      await createMultipleNotifications(adminIds, {
        type: 'success',
        title: 'Return Delivered',
        message: 'Recycled product has been delivered to the user.',
        link: '/admin/dashboard/requests',
      });
    }

    await doc.save();
    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Vendor return actions: approve or reject
router.patch(
  '/:id/return-action',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const { action, reason } = req.body; // 'approve' or 'reject'
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.vendorId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    if (doc.status !== 'return_requested') return res.status(400).json({ message: 'Invalid request status' });

    const adminIds = await getAdminIds();
    
    if (action === 'approve') {
      doc.status = 'return_approved';
      await createNotification(doc.userId, {
        type: 'success',
        title: 'Return Request Approved',
        message: 'Your return request has been approved!',
        link: '/dashboard/requests',
      });
      await createMultipleNotifications(adminIds, {
        type: 'info',
        title: 'Return Request Approved',
        message: `${req.user.name} approved a return request.`,
        link: '/admin/dashboard/requests',
      });
    } else if (action === 'reject') {
      doc.status = 'return_rejected';
      doc.returnRejectionReason = reason || '';
      await createNotification(doc.userId, {
        type: 'warning',
        title: 'Return Request Rejected',
        message: reason ? `Your return request was rejected: ${reason}` : 'Your return request was rejected.',
        link: '/dashboard/requests',
      });
      await createMultipleNotifications(adminIds, {
        type: 'warning',
        title: 'Return Request Rejected',
        message: `${req.user.name} rejected a return request.`,
        link: '/admin/dashboard/requests',
      });
      // Also update associated RecycledProduct back to awaiting_choice? Or listed? Let's set it back to awaiting_choice or sell? Let's check.
      const recycledProduct = await RecycledProduct.findOne({ requestId: doc._id });
      if (recycledProduct) {
        recycledProduct.status = 'awaiting_choice';
        await recycledProduct.save();
      }
    }

    await doc.save();
    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name email avatar');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// User: Cancel a pending/vendor accepted request
router.patch(
  '/:id/cancel',
  protect,
  authorize('user'),
  asyncHandler(async (req, res) => {
    const doc = await RecyclingRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (doc.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    if (!['pending', 'vendor_accepted'].includes(doc.status)) {
      return res.status(400).json({ message: 'Request can only be cancelled when pending or vendor accepted' });
    }

    doc.status = 'cancelled';
    await doc.save();

    await createNotification(doc.vendorId, {
      type: 'warning',
      title: 'Request Cancelled',
      message: `User cancelled the ${doc.category} recycling request.`,
      link: '/vendor/dashboard/requests',
    });

    const populated = await RecyclingRequest.findById(doc._id).populate('userId vendorId riderId', 'name avatar email');
    emitRequestUpdate(req, doc);
    res.json(formatRequest(req, populated));
  })
);

// Rider-specific endpoints
router.get(
  '/rider/assigned',
  protect,
  authorize('rider'),
  asyncHandler(async (req, res) => {
    const list = await RecyclingRequest.find({ riderId: req.user._id })
      .populate('userId vendorId', 'name email avatar phone')
      .sort({ createdAt: -1 });
    res.json(list.map((d) => formatRequest(req, d)));
  })
);

// Get single request
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const doc = await RecyclingRequest.findById(req.params.id).populate('userId vendorId riderId', 'name email avatar');
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    res.json(formatRequest(req, doc));
  })
);

export default router;
