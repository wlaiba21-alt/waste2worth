import mongoose from 'mongoose';

const recyclingRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    category: { type: String, required: true },
    quantity: { type: String, required: true },
    image: { type: String, default: '' },
    address: { type: String, required: true },
    pickupDate: { type: Date },
    status: {
      type: String,
      enum: [
        'pending',
        'vendor_accepted',
        'admin_rejected',
        'admin_approved',
        'rider_assigned',
        'rider_on_pickup',
        'rider_picked_up',
        'waste_received',
        'recycling_started',
        'recycling_completed',
        'return_requested',
        'return_approved',
        'return_rejected',
        'return_rider_assigned',
        'return_on_way',
        'product_returned',
        'product_sold',
        'vendor_rejected',
        'cancelled'
      ],
      default: 'pending'
    },
    notes: { type: String, default: '' },
    estimatedReward: { type: Number, default: 0 },
    finalReward: { type: Number, default: 0 }, // Final reward credited to user
    postRecyclingChoice: { type: String, enum: ['return', 'sell'] }, // User's choice after recycling
    recycledProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycledProduct' },
    recyclingStartedAt: { type: Date },
    estimatedCompletionDays: { type: Number },
    recyclingCompletedAt: { type: Date },
    returnAddress: { type: String },
    returnRejectionReason: { type: String, default: '' },
    riderAssignedAt: { type: Date },
    riderOnPickupAt: { type: Date },
    riderPickedUpAt: { type: Date },
    wasteReceivedAt: { type: Date },
    returnRiderAssignedAt: { type: Date },
    returnOnWayAt: { type: Date },
    productReturnedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('RecyclingRequest', recyclingRequestSchema);
