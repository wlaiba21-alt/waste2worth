import { Router } from 'express';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import Review from '../models/Review.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upload, setUploadFolder } from '../middleware/upload.js';

const router = Router();

function formatImagePath(img) {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  if (img.startsWith('/uploads')) return img;
  return '/' + img;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    const profiles = await VendorProfile.find({ approved: true }).populate('userId', 'name avatar');
    
    let result = profiles.map((p) => {
      const userId = p.userId?._id?.toString() || '';
      return {
        id: userId,
        profileId: p._id.toString(),
        name: p.businessName,
        photo: formatImagePath(p.photo || p.userId?.avatar),
        rating: p.rating,
        reviews: p.reviewCount,
        location: p.location,
        specialization: p.specialization || [],
        description: p.description,
        policies: p.policies,
        portfolio: (p.portfolio || []).map(item => ({
          ...item,
          before: formatImagePath(item.before),
          after: formatImagePath(item.after)
        })),
      };
    });

    if (category) {
      const categoryLower = category.toLowerCase();
      result = result.filter((v) =>
        v.specialization.some((s) => {
          const specLower = s.toLowerCase();
          return (
            specLower.includes(categoryLower) ||
            // Match category id variations
            (categoryLower === 'electronics' && (specLower.includes('electronic') || specLower.includes('e-waste'))) ||
            (categoryLower === 'cloth' && specLower.includes('textile'))
          );
        })
      );
    }
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((v) => v.name.toLowerCase().includes(q) || v.location.toLowerCase().includes(q));
    }
    
    res.json(result);
  })
);

router.get(
  '/me',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const profile = await VendorProfile.findOne({ userId: req.user._id }).populate('userId', 'name avatar email');
    if (!profile) return res.status(404).json({ message: 'Vendor not found' });
    const reviews = await Review.find({ vendorId: req.user._id })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({
      id: profile.userId._id.toString(),
      name: profile.businessName,
      photo: formatImagePath(profile.photo || profile.userId.avatar),
      rating: profile.rating,
      reviews: profile.reviewCount,
      location: profile.location,
      specialization: profile.specialization,
      description: profile.description,
      policies: profile.policies,
      portfolio: (profile.portfolio || []).map(item => ({
        ...item,
        before: formatImagePath(item.before),
        after: formatImagePath(item.after)
      })),
      reviewList: reviews.map((r) => ({
        id: r._id,
        user: r.userId?.name || 'User',
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt,
      })),
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const profile = await VendorProfile.findOne({ userId: req.params.id }).populate('userId', 'name avatar email');
    if (!profile) return res.status(404).json({ message: 'Vendor not found' });
    const reviews = await Review.find({ vendorId: req.params.id })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({
      id: profile.userId._id.toString(),
      name: profile.businessName,
      photo: formatImagePath(profile.photo || profile.userId.avatar),
      rating: profile.rating,
      reviews: profile.reviewCount,
      location: profile.location,
      specialization: profile.specialization,
      description: profile.description,
      policies: profile.policies,
      portfolio: (profile.portfolio || []).map(item => ({
        ...item,
        before: formatImagePath(item.before),
        after: formatImagePath(item.after)
      })),
      reviewList: reviews.map((r) => ({
        id: r._id,
        user: r.userId?.name || 'User',
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt,
      })),
    });
  })
);

router.patch(
  '/profile',
  protect,
  authorize('vendor'),
  setUploadFolder('vendors'),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const profile = await VendorProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });
    const fields = ['businessName', 'location', 'description', 'policies'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    });
    if (req.body.specialization) {
      try {
        profile.specialization = JSON.parse(req.body.specialization);
      } catch (e) {
        // If not valid JSON, use as is (could be array)
        profile.specialization = req.body.specialization;
      }
    }
    if (req.file) {
      profile.photo = `/uploads/vendors/${req.file.filename}`;
    } else if (req.body.photo) {
      profile.photo = req.body.photo;
    }
    await profile.save();
    res.json(profile);
  })
);

router.post(
  '/portfolio',
  protect,
  authorize('vendor'),
  setUploadFolder('portfolio'),
  upload.fields([{ name: 'before', maxCount: 1 }, { name: 'after', maxCount: 1 }]),
  asyncHandler(async (req, res) => {
    const profile = await VendorProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });
    const item = {
        before: req.files?.before ? `/uploads/portfolio/${req.files.before[0].filename}` : '',
        after: req.files?.after ? `/uploads/portfolio/${req.files.after[0].filename}` : '',
        description: req.body.description || '',
      };
    profile.portfolio.push(item);
    await profile.save();
    res.status(201).json(profile.portfolio);
  })
);

router.delete(
  '/portfolio/:index',
  protect,
  authorize('vendor'),
  asyncHandler(async (req, res) => {
    const profile = await VendorProfile.findOne({ userId: req.user._id });
    const idx = parseInt(req.params.index, 10);
    if (!profile || !profile.portfolio[idx]) return res.status(404).json({ message: 'Item not found' });
    profile.portfolio.splice(idx, 1);
    await profile.save();
    res.json(profile.portfolio);
  })
);

router.patch(
  '/:id/approve',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const profile = await VendorProfile.findOneAndUpdate(
      { userId: req.params.id },
      { approved: true },
      { new: true }
    );
    res.json(profile);
  })
);

export default router;
