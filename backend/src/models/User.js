import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 6, select: false },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ['user', 'vendor', 'admin', 'rider'], default: 'user' },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    recycleCount: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 100 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toPublic = function () {
  const formatAvatar = (img) => {
    if (!img) return '';
    if (img.startsWith('http')) return img;
    if (img.startsWith('/uploads')) return img;
    if (img.startsWith('uploads')) return `/${img}`;
    return img;
  };
  
  return {
    id: this._id.toString(),
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: formatAvatar(this.avatar),
    phone: this.phone,
    status: this.status,
    recycleCount: this.recycleCount,
    totalEarned: this.totalEarned,
    walletBalance: this.walletBalance,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
