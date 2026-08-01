import mongoose from 'mongoose';

const storeOrderSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycledProduct', required: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecyclingRequest' },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['wallet', 'cod', 'stripe'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    orderStatus: {
      type: String,
      enum: [
        'pending',          // order placed, awaiting vendor confirmation
        'processing',       // vendor confirmed order
        'rider_assigned',   // vendor assigned a delivery rider
        'out_for_delivery', // rider picked up, on way to buyer
        'delivered',        // rider delivered to buyer
        'cancelled',        // cancelled by user or admin
        // legacy statuses kept for backward compat
        'paid',
      ],
      default: 'pending',
    },
    commission: {
      vendor: { type: Number, default: 0 },
      user: { type: Number, default: 0 },
      admin: { type: Number, default: 0 },
    },
    shippingAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('StoreOrder', storeOrderSchema);
