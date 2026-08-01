import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import VendorProfile from './models/VendorProfile.js';
import RiderProfile from './models/RiderProfile.js';
import RecyclingRequest from './models/RecyclingRequest.js';
import RecycledProduct from './models/RecycledProduct.js';
import StoreOrder from './models/StoreOrder.js';
import Review from './models/Review.js';
import Address from './models/Address.js';
import MessageThread from './models/MessageThread.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';
import Transaction from './models/Transaction.js';
import { connectDB } from './config/db.js';

async function seed() {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    VendorProfile.deleteMany({}),
    RiderProfile.deleteMany({}),
    RecyclingRequest.deleteMany({}),
    RecycledProduct.deleteMany({}),
    StoreOrder.deleteMany({}),
    Review.deleteMany({}),
    Address.deleteMany({}),
    MessageThread.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
    Transaction.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@waste2worth.com',
    password: 'password123',
    role: 'admin',
    avatar: null,
    walletBalance: 0,
  });

  const sarah = await User.create({
    name: 'Sarah Jenkins',
    email: 'user@waste2worth.com',
    password: 'password123',
    role: 'user',
    avatar: null,
    phone: '(555) 123-4567',
    walletBalance: 250,
    recycleCount: 3,
    totalEarned: 45,
  });

  const mike = await User.create({
    name: 'Mike Thompson',
    email: 'mike@waste2worth.com',
    password: 'password123',
    role: 'user',
    avatar: null,
    walletBalance: 100,
  });

  const ecoVendor = await User.create({
    name: 'EcoPlast Solutions',
    email: 'vendor@waste2worth.com',
    password: 'password123',
    role: 'vendor',
    avatar: null,
    walletBalance: 500,
    totalEarned: 1200,
  });

  const metalVendor = await User.create({
    name: 'GreenMetal Works',
    email: 'metal@waste2worth.com',
    password: 'password123',
    role: 'vendor',
    avatar: null,
    walletBalance: 300,
  });

  const alexRider = await User.create({
    name: 'Alex Rider',
    email: 'alex@waste2worth.com',
    password: 'password123',
    role: 'rider',
    avatar: null,
    phone: '(555) 987-6543',
    walletBalance: 150,
  });

  const jordanRider = await User.create({
    name: 'Jordan Smith',
    email: 'jordan@waste2worth.com',
    password: 'password123',
    role: 'rider',
    avatar: null,
    phone: '(555) 456-7890',
    walletBalance: 100,
  });

  const taylorRider = await User.create({
    name: 'Taylor Lee',
    email: 'taylor@waste2worth.com',
    password: 'password123',
    role: 'rider',
    avatar: null,
    phone: '(555) 234-5678',
    walletBalance: 200,
  });

  await RiderProfile.create([
    {
      userId: alexRider._id,
      availabilityStatus: 'available',
    },
    {
      userId: jordanRider._id,
      availabilityStatus: 'active',
    },
    {
      userId: taylorRider._id,
      availabilityStatus: 'active',
    }
  ]);

  await VendorProfile.create([
    {
      userId: ecoVendor._id,
      businessName: 'EcoPlast Solutions',
      photo: null,
      location: 'New York, NY',
      specialization: ['Plastic', 'Rubber'],
      description: 'Leading industrial plastic recycling and repurposing.',
      policies: 'Minimum pickup: 50kg. Free pickup within 20 miles.',
      portfolio: [],
      rating: 4.8,
      reviewCount: 2,
    },
    {
      userId: metalVendor._id,
      businessName: 'GreenMetal Works',
      photo: null,
      location: 'Chicago, IL',
      specialization: ['Metal'],
      description: 'Scrap metal recovery and smelting specialists.',
      policies: 'All metals must be sorted. Payment upon weighing.',
      rating: 4.9,
      reviewCount: 1,
    },
  ]);

  await Address.create({
    userId: sarah._id,
    label: 'Home',
    street: '123 Green St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    isDefault: true,
  });

  const req1 = await RecyclingRequest.create({
    userId: sarah._id,
    vendorId: ecoVendor._id,
    category: 'Plastic',
    quantity: '50 kg',
    image: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600',
    address: '123 Green St, New York, NY',
    pickupDate: new Date('2024-05-20'),
    status: 'recycling_completed',
    notes: 'Mostly PET bottles, rinsed.',
    estimatedReward: 15,
    recyclingStartedAt: new Date('2024-05-21'),
    recyclingCompletedAt: new Date('2024-05-25'),
    estimatedCompletionDays: 4,
  });

  const req2 = await RecyclingRequest.create({
    userId: mike._id,
    vendorId: metalVendor._id,
    category: 'Metal',
    quantity: '120 kg',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=600',
    address: '456 Industrial Pkwy, Chicago, IL',
    pickupDate: new Date('2024-06-02'),
    status: 'recycling_started',
    notes: 'Mixed scrap aluminum.',
    estimatedReward: 85,
    recyclingStartedAt: new Date(),
    estimatedCompletionDays: 3,
  });

  const listedProduct = await RecycledProduct.create({
    requestId: req1._id,
    vendorId: ecoVendor._id,
    ownerUserId: sarah._id,
    title: 'Eco Garden Planter (from PET)',
    description: 'Handcrafted planter made from recycled PET bottles. Perfect for home gardens.',
    images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600'],
    category: 'Plastic',
    price: 45,
    status: 'listed',
  });
  req1.recycledProductId = listedProduct._id;
  await req1.save();

  const req3 = await RecyclingRequest.create({
    userId: mike._id,
    vendorId: metalVendor._id,
    category: 'Metal',
    quantity: '80 kg',
    image: 'https://images.unsplash.com/photo-1518534244342-1246c4334f51?auto=format&fit=crop&q=80&w=600',
    address: '456 Industrial Pkwy, Chicago, IL',
    pickupDate: new Date('2024-06-10'),
    status: 'recycling_completed',
    notes: 'Aluminum scrap sorted for store listing.',
    estimatedReward: 70,
  });

  const listedProductMike = await RecycledProduct.create({
    requestId: req3._id,
    vendorId: metalVendor._id,
    ownerUserId: mike._id,
    title: 'Recycled Aluminum Desk Organizer',
    description: 'Sleek desk organizer from recycled aluminum scrap.',
    images: ['https://images.unsplash.com/photo-1518534244342-1246c4334f51?auto=format&fit=crop&q=80&w=600'],
    category: 'Metal',
    price: 60,
    status: 'listed',
  });
  req3.recycledProductId = listedProductMike._id;
  await req3.save();

  const awaitingProduct = await RecycledProduct.create({
    requestId: req2._id,
    vendorId: metalVendor._id,
    ownerUserId: mike._id,
    title: 'Recycled Aluminum Desk Organizer',
    description: 'Sleek desk organizer from recycled aluminum scrap.',
    images: ['https://images.unsplash.com/photo-1518534244342-1246c4334f51?auto=format&fit=crop&q=80&w=600'],
    category: 'Metal',
    price: 60,
    status: 'awaiting_choice',
  });

  await StoreOrder.create([
    {
      productId: listedProduct._id,
      requestId: req1._id,
      buyerId: mike._id,
      vendorId: ecoVendor._id,
      originalOwnerId: sarah._id,
      amount: 45,
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      shippingAddress: '456 Industrial Pkwy, Chicago, IL',
      commission: { vendor: 27, user: 11.25, admin: 6.75 },
    },
    {
      productId: listedProductMike._id,
      requestId: req3._id,
      buyerId: sarah._id,
      vendorId: metalVendor._id,
      originalOwnerId: mike._id,
      amount: 60,
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      orderStatus: 'paid',
      shippingAddress: '123 Green St, New York, NY',
      commission: { vendor: 36, user: 15, admin: 9 },
    },
  ]);

  await Review.create([
    { userId: sarah._id, vendorId: ecoVendor._id, requestId: req1._id, rating: 5, comment: 'Fast pickup and very professional!' },
    { userId: mike._id, vendorId: ecoVendor._id, rating: 4, comment: 'Good service overall.' },
  ]);

  const thread = await MessageThread.create({ userId: sarah._id, vendorId: ecoVendor._id });
  await Message.create([
    { threadId: thread._id, senderId: sarah._id, text: 'Hi, I have about 50kg of PET bottles. Do you pick up from Brooklyn?', seen: true },
    { threadId: thread._id, senderId: ecoVendor._id, text: 'Hello Sarah! Yes, we do pickups in Brooklyn for quantities over 40kg.', seen: true },
  ]);

  await Notification.create([
    { userId: sarah._id, type: 'success', title: 'Product Listed', message: 'Your eco planter is live in the store!', read: false, link: '/store' },
    { userId: sarah._id, type: 'info', title: 'New Recycling Request', message: 'Your plastic recycling request has been received.', read: false },
    { userId: mike._id, type: 'info', title: 'Product Ready', message: 'Choose to take back or list your recycled desk organizer.', read: false, link: `/dashboard/product-choice/${awaitingProduct._id}` },
    { userId: ecoVendor._id, type: 'info', title: 'New Request', message: 'Mike submitted a metal recycling request.', read: false },
    { userId: ecoVendor._id, type: 'info', title: 'New Order', message: 'You have a new store order!', read: false },
    { userId: admin._id, type: 'info', title: 'New User', message: 'A new user signed up!', read: false },
    { userId: admin._id, type: 'info', title: 'New Request', message: 'New recycling request submitted.', read: false },
    { userId: alexRider._id, type: 'info', title: 'New Task', message: 'You have a new pickup task!', read: false },
    { userId: jordanRider._id, type: 'info', title: 'Welcome', message: 'Welcome to Waste2Worth!', read: false },
    { userId: taylorRider._id, type: 'info', title: 'Welcome', message: 'Welcome to Waste2Worth!', read: false },
  ]);

  console.log('\n✅ Database seeded!\n');
  console.log('Demo accounts (password: password123):');
  console.log('  Admin:  admin@waste2worth.com');
  console.log('  User:   user@waste2worth.com  (Sarah, $250 wallet)');
  console.log('  User:   mike@waste2worth.com');
  console.log('  Vendor: vendor@waste2worth.com (EcoPlast)');
  console.log('  Vendor: metal@waste2worth.com (GreenMetal)');
  console.log('  Rider:  alex@waste2worth.com\n');

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
