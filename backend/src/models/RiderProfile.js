import mongoose from 'mongoose';

const riderProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['active', 'inactive', 'busy', 'available', 'assigned', 'on_pickup', 'picked_up', 'delivered'],
      default: 'active',
    },
    completedTasks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('RiderProfile', riderProfileSchema);
