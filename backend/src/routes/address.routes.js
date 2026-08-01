import { Router } from 'express';
import Address from '../models/Address.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', protect, authorize('user'), asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1 });
  res.json(addresses);
}));

router.post('/', protect, authorize('user'), asyncHandler(async (req, res) => {
  if (req.body.isDefault) {
    await Address.updateMany({ userId: req.user._id }, { isDefault: false });
  }
  const address = await Address.create({ ...req.body, userId: req.user._id });
  res.status(201).json(address);
}));

router.patch('/:id', protect, authorize('user'), asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
  if (!address) return res.status(404).json({ message: 'Not found' });
  if (req.body.isDefault) await Address.updateMany({ userId: req.user._id }, { isDefault: false });
  Object.assign(address, req.body);
  await address.save();
  res.json(address);
}));

router.delete('/:id', protect, authorize('user'), asyncHandler(async (req, res) => {
  await Address.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
}));

export default router;
