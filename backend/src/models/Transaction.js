import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['topup', 'purchase', 'sale_commission', 'recycling_reward', 'refund', 'cod_received', 'rider_fee', 'recycling_service_charge'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },
    description: { type: String, default: '' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreOrder' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycledProduct' },
    // New fields for recycled product transactions
    productName: { type: String, default: '' },
    productValue: { type: Number, default: 0 }, // Original product value
    recyclingExpense: { type: Number, default: 0 }, // Recycling expense deducted
    pickupServiceCharge: { type: Number, default: 0 }, // Pickup/service charge deducted
    finalReward: { type: Number, default: 0 }, // Final reward credited to user
    transactionStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
