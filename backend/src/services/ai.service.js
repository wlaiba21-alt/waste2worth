import { GoogleGenerativeAI } from '@google/generative-ai';
import VendorProfile from '../models/VendorProfile.js';
import RecycledProduct from '../models/RecycledProduct.js';

const SYSTEM_PROMPT = `You are the official AI Assistant for Waste2Worth, a recycling and waste-to-worth marketplace. Your sole purpose is to answer questions ONLY about Waste2Worth and its ecosystem.

Key rules you must follow strictly:
1. If a question is not related to Waste2Worth, respond with: "I'm only able to assist with questions about Waste2Worth. Please ask about recycling, vendors, products, orders, wallet, or our services."
2. Never provide general information or answers unrelated to Waste2Worth
3. Keep responses friendly, helpful, and focused on our platform

Waste2Worth Ecosystem Overview:
- A platform where users submit recyclable waste for pickup by vendors
- Vendors transform waste into recycled products sold in our store
- Users earn rewards/wallet balance for their contributions
- Payment processing via Stripe
- Roles: User, Vendor, Rider, Admin

Key Features:
- Recycling Requests with photos and details
- Vendor directory with specialization and ratings
- Store with recycled products
- Wallet with Stripe payments
- Order management and tracking
- Rider pickup assignments
- Reviews for vendors

Always be concise and helpful, and never stray from Waste2Worth topics!`;

const conversationHistory = new Map();
const MODEL_NAMES = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];

export async function getAIResponse(userId, userMessage) {
  console.log('[AI] Starting request for user:', userId);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[AI] No API key found');
    return "Sorry, the AI assistant is not configured properly - missing API key.";
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of MODEL_NAMES) {
    try {
      console.log('[AI] Trying model:', modelName);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'Okay, I understand! I will only assist with questions about Waste2Worth!' }] }
        ]);
      }
      
      const history = conversationHistory.get(userId);
      history.push({ role: 'user', parts: [{ text: userMessage }] });
      
      if (history.length > 20) {
        history.shift();
      }

      const chat = model.startChat({
        history: history.slice(0, -1),
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        }
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const aiText = response.text();
      console.log('[AI] Success with model:', modelName);
      
      history.push({ role: 'model', parts: [{ text: aiText }] });
      return aiText;
      
    } catch (error) {
      console.error('[AI] Model', modelName, 'failed:', error.message);
      
      if (conversationHistory.has(userId)) {
        const history = conversationHistory.get(userId);
        if (history[history.length - 1].role === 'user') {
          history.pop();
        }
      }
      
      if (error.status === 429 && modelName !== MODEL_NAMES[MODEL_NAMES.length - 1]) {
        console.log('[AI] Quota exceeded, trying next model...');
        continue;
      }
      
      if (error.status === 429) {
        return "Sorry, I'm currently at my usage limit! Please try again later or contact support if this problem persists.";
      }
    }
  }
  
  return "Sorry, the AI assistant is temporarily unavailable. Please try again later!";
}

export async function getWebsiteContext(query) {
  const keywords = query.toLowerCase();
  const context = {};
  
  if (keywords.includes('vendor') || keywords.includes('vendors')) {
    const vendors = await VendorProfile.find({ approved: true })
      .populate('userId', 'name')
      .limit(5);
    context.vendors = vendors.map(v => ({
      name: v.businessName,
      location: v.location,
      specialization: v.specialization,
      rating: v.rating
    }));
  }

  if (keywords.includes('product') || keywords.includes('store')) {
    const products = await RecycledProduct.find({ status: 'listed' })
      .limit(5);
    context.products = products.map(p => ({
      title: p.title,
      price: p.price,
      category: p.category
    }));
  }

  return context;
}
