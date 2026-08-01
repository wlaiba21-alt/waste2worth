import mongoose from 'mongoose';

const recycledProductSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecyclingRequest', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    category: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['awaiting_choice', 'take_back', 'return_requested', 'listed', 'sold'],
      default: 'awaiting_choice',
    },
    // New fields for the requirement
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Alias for ownerUserId
    productOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Alias for ownerUserId
    recycleDecision: { type: String, enum: ['take_back', 'list_for_sale'], default: null },
    commissionPercentage: { type: Number, default: 25 }, // 25% commission
    returnStatus: { type: String, enum: ['not_requested', 'requested', 'in_progress', 'delivered'], default: 'not_requested' },
    recycleType: { type: String, default: '' },
    productStatus: { type: String, enum: ['new', 'like_new', 'good', 'fair', 'poor'], default: 'good' },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-save hook to set ownerId and productOwnerId = ownerUserId
recycledProductSchema.pre('save', function(next) {
  if (this.ownerUserId) {
    this.ownerId = this.ownerUserId;
    this.productOwnerId = this.ownerUserId;
  }
  next();
});

export default mongoose.model('RecycledProduct', recycledProductSchema);
