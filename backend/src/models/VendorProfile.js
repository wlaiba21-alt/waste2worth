import mongoose from 'mongoose';

const portfolioItemSchema = new mongoose.Schema({
  before: String,
  after: String,
  description: { type: String, default: '' },
});

const vendorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    photo: { type: String, default: '' },
    location: { type: String, default: '' },
    specialization: [{ type: String }],
    description: { type: String, default: '' },
    policies: { type: String, default: '' },
    portfolio: [portfolioItemSchema],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    approved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('VendorProfile', vendorProfileSchema);
