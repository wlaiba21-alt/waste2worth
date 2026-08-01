import mongoose from 'mongoose';

const messageThreadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

messageThreadSchema.index({ userId: 1, vendorId: 1 }, { unique: true });

export default mongoose.model('MessageThread', messageThreadSchema);
