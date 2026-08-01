import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upload, setUploadFolder } from '../middleware/upload.js';
import VendorProfile from '../models/VendorProfile.js';
import { getAIResponse } from '../services/ai.service.js';

const router = Router();

const CATEGORIES = {
  plastic: { label: 'Plastic - PET Bottle', confidence: 94, weight: '0.5 - 2 kg', specs: ['Plastic'] },
  paper: { label: 'Paper - Cardboard', confidence: 88, weight: '1 - 5 kg', specs: ['Paper'] },
  metal: { label: 'Metal - Aluminum', confidence: 91, weight: '0.5 - 3 kg', specs: ['Metal'] },
  glass: { label: 'Glass - Bottles', confidence: 86, weight: '1 - 4 kg', specs: ['Glass'] },
  rubber: { label: 'Rubber - Tire', confidence: 82, weight: '5 - 15 kg', specs: ['Rubber'] },
  cloth: { label: 'Textile - Fabric', confidence: 79, weight: '0.5 - 3 kg', specs: ['Cloth'] },
};

router.post(
  '/detect',
  protect,
  setUploadFolder('ai'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const hint = (req.body.hint || 'plastic').toLowerCase();
    const detected = CATEGORIES[hint] || CATEGORIES.plastic;

    const vendors = await VendorProfile.find({ approved: true });
    const suggested = vendors
      .filter((v) => v.specialization.some((s) => detected.specs.some((d) => s.toLowerCase().includes(d.toLowerCase()))))
      .slice(0, 3)
      .map((v) => ({
        id: v.userId.toString(),
        name: v.businessName,
        photo: v.photo,
        rating: v.rating,
        location: v.location,
        specialization: v.specialization,
      }));

    const imageUrl = req.file ? `/uploads/ai/${req.file.filename}` : null;
    res.json({
      category: detected.label,
      confidence: detected.confidence,
      estimatedWeight: detected.weight,
      imageUrl,
      suggestedVendors: suggested.length ? suggested : vendors.slice(0, 3).map((v) => ({
        id: v.userId.toString(),
        name: v.businessName,
        photo: v.photo,
        rating: v.rating,
        location: v.location,
        specialization: v.specialization,
      })),
    });
  })
);

router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    console.log('[AI ROUTE] Received chat request!');
    console.log('[AI ROUTE] Request body:', req.body);
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      console.log('[AI ROUTE] No message provided, returning 400');
      return res.status(400).json({ message: 'Message is required' });
    }

    console.log('[AI ROUTE] Processing message:', message);
    // If user might not be logged in, use a default ID for demo
    const userId = req.user?._id.toString() || 'guest-user';
    console.log('[AI ROUTE] User ID:', userId);
    const response = await getAIResponse(userId, message);
    console.log('[AI ROUTE] AI response:', response);
    
    res.json({ response });
  })
);

export default router;
