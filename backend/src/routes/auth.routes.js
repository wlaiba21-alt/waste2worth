import { Router } from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import Transaction from '../models/Transaction.js';
import { generateToken } from '../utils/generateToken.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upload, setUploadFolder } from '../middleware/upload.js';

const router = Router();

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

async function createVendorProfile(user, name, opts = {}) {
  await VendorProfile.create({
    userId: user._id,
    businessName: name,
    location: opts.location || 'United States',
    specialization: opts.specialization || ['Plastic', 'Paper'],
    description: opts.description || 'Certified recycling partner on Waste2Worth.',
    approved: true,
  });
}

router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { credential, role = 'user', mode = 'signup' } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential is required' });
    if (!googleClient) {
      return res.status(503).json({ message: 'Google sign-in is not configured on the server' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: 'Invalid Google sign-in token' });
    }

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();
    const name = payload.name || email?.split('@')[0] || 'User';
    const picture = payload.picture || '';

    if (!email) return res.status(400).json({ message: 'Google account has no email address' });

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended' });
      }
      if (mode === 'signup') {
        const requestedRole = ['user', 'vendor'].includes(role) ? role : 'user';
        if (user.role !== requestedRole) {
          return res.status(409).json({
            message: `This email is already registered as a ${user.role}. Log in from the login page. You cannot switch to ${requestedRole} via sign up.`,
          });
        }
        return res.status(409).json({
          message: 'An account with this email already exists. Please log in instead.',
        });
      }
      let changed = false;
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      if (picture && (user.googleId || !user.avatar)) {
        user.avatar = picture;
        changed = true;
      }
      if (changed) await user.save();
    } else {
      if (mode === 'login') {
        return res.status(404).json({
          message: 'No account found with this Google email. Please sign up first and choose User or Vendor.',
        });
      }
      const userRole = ['user', 'vendor'].includes(role) ? role : 'user';
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        password: crypto.randomBytes(32).toString('hex'),
        avatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22C55E&color=fff`,
        role: userRole,
        walletBalance: userRole === 'user' ? 100 : 0,
      });

      if (userRole === 'vendor') {
        await createVendorProfile(user, name);
      }
    }

    const token = generateToken(user._id, user.role);
    res.json({ token, user: user.toPublic() });
  })
);

router.post(
  '/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { name, email, password, role = 'user', location, specialization, description } = req.body;
    const normalizedEmail = email?.toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const userRole = ['user', 'vendor'].includes(role) ? role : 'user';
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: userRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22C55E&color=fff`,
      walletBalance: userRole === 'user' ? 100 : 0,
    });

    if (userRole === 'vendor') {
      await createVendorProfile(user, name, { location, specialization, description });
    }

    const token = generateToken(user._id, user.role);
    res.status(201).json({ token, user: user.toPublic() });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    // Trim inputs first
    const email = req.body.email?.trim();
    const password = req.body.password?.trim();
    console.log('Login request body:', req.body, 'trimmed:', { email, password });
    
    // Simple manual validation
    if (!email) {
      return res.status(400).json({ message: 'Please enter your email' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Please enter your password' });
    }

    const normalizedEmail = email?.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended' });
    }
    if (!user.password) {
      return res.status(401).json({
        message: 'This account uses Google sign-in. Please use Continue with Google.',
      });
    }
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = generateToken(user._id, user.role);
    res.json({ token, user: user.toPublic() });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    // ✅ ROOT CAUSE FIX: Explicitly RE-FETCH user document DIRECTLY from MongoDB
    // at the TIME this /auth/me request is processed, not using the stale pre-loaded
    // req.user object from protect middleware. This GUARANTEES that if a top-up
    // atomic $inc completed 1ms before refreshUser() fires, /auth/me returns the
    // CORRECT new walletBalance + totalEarned instead of a stale cached value!
    const freshUser = await User.findById(req.user._id);
    if (!freshUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    let vendorProfile = null;
    if (freshUser.role === 'vendor') {
      vendorProfile = await VendorProfile.findOne({ userId: freshUser._id });
    }

    console.log(`[GET /auth/me] userId=${freshUser._id} FRESH from MongoDB: walletBalance=${freshUser.walletBalance}, totalEarned=${freshUser.totalEarned}`);

    res.json({ user: freshUser.toPublic(), vendorProfile });
  })
);

router.patch(
  '/profile',
  protect,
  setUploadFolder('avatars'),
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    const { name, phone, avatar } = req.body;
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (req.file) {
      req.user.avatar = `/uploads/avatars/${req.file.filename}`;
    } else if (avatar) {
      req.user.avatar = avatar;
    }
    await req.user.save();
    res.json({ user: req.user.toPublic() });
  })
);

export default router;
