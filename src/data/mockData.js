export const categories = [
{ id: 'paper', name: 'Paper', icon: 'Newspaper' },
{ id: 'plastic', name: 'Plastic', icon: 'Bottle' },
{ id: 'metal', name: 'Metal', icon: 'Anvil' },
{ id: 'glass', name: 'Glass', icon: 'GlassWater' },
{ id: 'rubber', name: 'Rubber', icon: 'CircleDashed' },
{ id: 'cloth', name: 'Cloth', icon: 'Shirt' }];


export const mockVendors = [
{
  id: 'v1',
  name: 'EcoPlast Solutions',
  photo: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=200&h=200',
  rating: 4.8,
  reviews: 124,
  location: 'New York, NY',
  specialization: ['Plastic', 'Rubber'],
  description: 'Leading the way in industrial plastic recycling and repurposing. We transform single-use plastics into durable construction materials.',
  policies: 'Minimum pickup: 50kg. Free pickup within 20 miles.',
  portfolio: [
  {
    id: 'p1',
    before: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600',
    after: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
    description: 'PET bottles to eco-bricks'
  }]

},
{
  id: 'v2',
  name: 'GreenMetal Works',
  photo: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=200&h=200',
  rating: 4.9,
  reviews: 89,
  location: 'Chicago, IL',
  specialization: ['Metal'],
  description: 'Specialists in scrap metal recovery and smelting. We offer competitive rates for copper, aluminum, and steel.',
  policies: 'All metals must be sorted. Payment upon weighing.',
  portfolio: [
  {
    id: 'p2',
    before: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=600',
    after: 'https://images.unsplash.com/photo-1518534244342-1246c4334f51?auto=format&fit=crop&q=80&w=600',
    description: 'Scrap aluminum to ingots'
  }]

},
{
  id: 'v3',
  name: 'PaperCycle Inc.',
  photo: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=200&h=200',
  rating: 4.6,
  reviews: 210,
  location: 'Seattle, WA',
  specialization: ['Paper'],
  description: 'Your local partner for commercial and residential paper recycling. Turning yesterday\'s news into tomorrow\'s packaging.',
  policies: 'No contaminated paper (food waste).',
  portfolio: []
},
{
  id: 'v4',
  name: 'GlassRoots Recycling',
  photo: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=200&h=200',
  rating: 4.7,
  reviews: 156,
  location: 'Austin, TX',
  specialization: ['Glass'],
  description: 'We crush it! GlassRoots turns bottles and jars into sand and cullet for manufacturing and landscaping.',
  policies: 'Please rinse all containers. Lids removed.',
  portfolio: []
},
{
  id: 'v5',
  name: 'ThreadBare Renewals',
  photo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&q=80&w=200&h=200',
  rating: 4.5,
  reviews: 67,
  location: 'Portland, OR',
  specialization: ['Cloth'],
  description: 'Textile recycling for a circular fashion economy. We sort, shred, and spin old garments into new fibers.',
  policies: 'Clothes must be washed. No heavily soiled items.',
  portfolio: []
},
{
  id: 'v6',
  name: 'TireTread Co.',
  photo: 'https://images.unsplash.com/photo-1605371804245-566d54238714?auto=format&fit=crop&q=80&w=200&h=200',
  rating: 4.8,
  reviews: 92,
  location: 'Detroit, MI',
  specialization: ['Rubber'],
  description: 'Specializing in automotive rubber recycling. We create playground surfaces and athletic tracks from old tires.',
  policies: 'Tires must be off-rim.',
  portfolio: []
}];


export const mockReviews = [
{ id: 1, user: 'Sarah J.', rating: 5, comment: 'Fast pickup and very professional. Highly recommend!', date: '2 days ago' },
{ id: 2, user: 'Mike T.', rating: 4, comment: 'Good service, but they arrived a bit late.', date: '1 week ago' },
{ id: 3, user: 'Elena R.', rating: 5, comment: 'Love their mission. The whole process was seamless.', date: '2 weeks ago' }];


export const mockUsers = [
{ id: 'u1', name: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '(555) 123-4567', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150', joinedDate: '2023-01-15', recycleCount: 12, totalEarned: 150.50, status: 'active' },
{ id: 'u2', name: 'Mike Thompson', email: 'mike.t@example.com', phone: '(555) 234-5678', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150', joinedDate: '2023-03-22', recycleCount: 8, totalEarned: 85.00, status: 'active' },
{ id: 'u3', name: 'Elena Rodriguez', email: 'elena.r@example.com', phone: '(555) 345-6789', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150', joinedDate: '2023-06-10', recycleCount: 24, totalEarned: 320.75, status: 'active' },
{ id: 'u4', name: 'David Chen', email: 'david.c@example.com', phone: '(555) 456-7890', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150', joinedDate: '2023-08-05', recycleCount: 3, totalEarned: 45.20, status: 'active' },
{ id: 'u5', name: 'Lisa Wong', email: 'lisa.w@example.com', phone: '(555) 567-8901', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150', joinedDate: '2023-11-12', recycleCount: 0, totalEarned: 0, status: 'suspended' }];


export const mockRequests = [
{ id: 'req1', userId: 'u1', vendorId: 'v1', category: 'Plastic', quantity: '50 kg', image: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600', address: '123 Green St, New York, NY', pickupDate: '2024-05-20', status: 'completed', notes: 'Mostly PET bottles, rinsed.', createdAt: '2024-05-15', estimatedReward: '$15.00' },
{ id: 'req2', userId: 'u2', vendorId: 'v2', category: 'Metal', quantity: '120 kg', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=600', address: '456 Industrial Pkwy, Chicago, IL', pickupDate: '2024-06-02', status: 'in-progress', notes: 'Mixed scrap aluminum and copper.', createdAt: '2024-05-28', estimatedReward: '$85.00' },
{ id: 'req3', userId: 'u3', vendorId: 'v1', category: 'Plastic', quantity: '30 kg', image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600', address: '789 Eco Ave, New York, NY', pickupDate: '2024-06-10', status: 'pending', notes: 'HDPE containers.', createdAt: '2024-06-05', estimatedReward: '$8.00' },
{ id: 'req4', userId: 'u4', vendorId: 'v3', category: 'Paper', quantity: '200 kg', image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=600', address: '101 Office Blvd, Seattle, WA', pickupDate: '2024-06-15', status: 'accepted', notes: 'Office paper, shredded.', createdAt: '2024-06-08', estimatedReward: '$25.00' },
{ id: 'req5', userId: 'u1', vendorId: 'v4', category: 'Glass', quantity: '80 kg', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=600', address: '123 Green St, New York, NY', pickupDate: '2024-05-01', status: 'rejected', notes: 'Mixed colored glass.', createdAt: '2024-04-25', estimatedReward: '$12.00' }];


export const mockOrders = [
{ id: 'ord1', requestId: 'req1', userId: 'u1', vendorId: 'v1', date: '2024-05-22', amount: 60.00, commission: { vendor: 36.00, user: 15.00, admin: 9.00 }, status: 'paid' }];


export const mockMessages = [
{
  threadId: 't1',
  userId: 'u1',
  vendorId: 'v1',
  messages: [
  { id: 'm1', senderId: 'u1', text: 'Hi, I have about 50kg of PET bottles. Do you pick up from Brooklyn?', timestamp: '2024-05-14T10:00:00Z', seen: true },
  { id: 'm2', senderId: 'v1', text: 'Hello Sarah! Yes, we do pickups in Brooklyn for quantities over 40kg. I can schedule you for next Tuesday.', timestamp: '2024-05-14T10:15:00Z', seen: true },
  { id: 'm3', senderId: 'u1', text: 'Perfect, Tuesday works for me. I will submit the request now.', timestamp: '2024-05-14T10:20:00Z', seen: true }]

},
{
  threadId: 't2',
  userId: 'u2',
  vendorId: 'v2',
  messages: [
  { id: 'm4', senderId: 'u2', text: 'Are you currently accepting copper wiring?', timestamp: '2024-05-27T14:30:00Z', seen: true },
  { id: 'm5', senderId: 'v2', text: 'Yes we are. Current rate is $3.50/lb if stripped.', timestamp: '2024-05-27T15:00:00Z', seen: false }]

}];


export const mockNotifications = {
  user: [
  { id: 'n1', type: 'success', title: 'Request Completed', message: 'Your plastic recycling request with EcoPlast Solutions has been completed. You earned $15.00!', time: '2 hours ago', read: false },
  { id: 'n2', type: 'info', title: 'Pickup Scheduled', message: 'GreenMetal Works has scheduled your pickup for tomorrow at 10 AM.', time: '1 day ago', read: true }],

  vendor: [
  { id: 'n3', type: 'info', title: 'New Request', message: 'Elena Rodriguez submitted a new request for 30kg of Plastic.', time: '5 mins ago', read: false },
  { id: 'n4', type: 'success', title: 'Payment Received', message: 'You received a payout of $36.00 for Order #ord1.', time: '2 days ago', read: true }],

  admin: [
  { id: 'n5', type: 'warning', title: 'New Vendor Registration', message: 'A new vendor "CityScrap" is pending approval.', time: '1 hour ago', read: false }]

};

export const mockChartData = {
  wasteByCategory: [
  { name: 'Paper', value: 4500 },
  { name: 'Plastic', value: 3200 },
  { name: 'Metal', value: 2800 },
  { name: 'Glass', value: 1500 },
  { name: 'Rubber', value: 800 },
  { name: 'Cloth', value: 600 }],

  monthlyEarnings: [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 4500 },
  { name: 'Mar', revenue: 5200 },
  { name: 'Apr', revenue: 4800 },
  { name: 'May', revenue: 6100 },
  { name: 'Jun', revenue: 7500 }],

  userGrowth: [
  { name: 'Jan', users: 1200 },
  { name: 'Feb', users: 1500 },
  { name: 'Mar', users: 2100 },
  { name: 'Apr', users: 2800 },
  { name: 'May', users: 3600 },
  { name: 'Jun', users: 4500 }],

  requestsByStatus: [
  { name: 'Completed', value: 65 },
  { name: 'In Progress', value: 20 },
  { name: 'Pending', value: 10 },
  { name: 'Rejected', value: 5 }]

};