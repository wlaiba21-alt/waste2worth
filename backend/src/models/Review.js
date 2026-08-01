import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecyclingRequest' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreOrder' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycledProduct' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    vendorReply: { type: String, default: '' },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

// Ensure only one review per user per request/order
reviewSchema.index({ userId: 1, requestId: 1 }, { sparse: true });
reviewSchema.index({ userId: 1, orderId: 1 }, { sparse: true });

export default mongoose.model('Review', reviewSchema);
