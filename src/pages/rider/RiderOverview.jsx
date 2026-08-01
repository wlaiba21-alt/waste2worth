import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListOrdered, User, Check, XCircle, DollarSign,
  Truck, MapPin, ArrowRight, Loader2, Eye, ClipboardList,
  ShoppingBag, Package, CheckCircle2, Clock
} from 'lucide-react';
import { riderApi, requestApi, orderApi } from '../../api';
import { toast } from 'sonner';
import { getSocket } from '../../lib/socket';

// Timeline definitions
const PICKUP_TIMELINE = [
  { key: 'rider_assigned', label: 'Pickup Assigned', description: 'Task has been assigned to you' },
  { key: 'rider_on_pickup', label: 'Pickup Started', description: 'You are on the way to pickup' },
  { key: 'rider_picked_up', label: 'Order Picked Up', description: 'You have picked up the order' },
  { key: 'waste_received', label: 'Delivered', description: 'Order delivered to vendor' },
];

const RETURN_TIMELINE = [
  { key: 'return_rider_assigned', label: 'Return Assigned', description: 'Return task has been assigned to you' },
  { key: 'return_on_way', label: 'Return Started', description: 'You are on the way to deliver the return' },
  { key: 'product_returned', label: 'Return Completed', description: 'Product returned to user' },
];

const getToastMessage = (status) => {
  switch (status) {
    case 'rider_on_pickup': return 'You have started pickup';
    case 'rider_picked_up': return 'Order picked up successfully';
    case 'waste_received': return 'Order delivered successfully';
    case 'return_on_way': return 'You have started return delivery';
    case 'product_returned': return 'Return completed successfully';
    default: return 'Status updated successfully!';
  }
};

const getButtonLabel = (status) => {
  switch (status) {
    case 'rider_assigned': return 'Start Pickup';
    case 'rider_on_pickup': return 'Mark as Picked Up';
    case 'rider_picked_up': return 'Mark as Delivered';
    case 'return_rider_assigned': return 'Start Return Delivery';
    case 'return_on_way': return 'Mark as Returned';
    default: return '';
  }
};

function StatusTimeline({ currentStatus, isReturn }) {
  const timeline = isReturn ? RETURN_TIMELINE : PICKUP_TIMELINE;
  const currentIndex = timeline.findIndex(step => step.key === currentStatus);

  return (
    <div className="mb-6">
      <p className="text-xs text-text-light font-semibold uppercase tracking-wider mb-3">Delivery Progress</p>
      <div className="space-y-2">
        {timeline.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const Icon = isCompleted ? CheckCircle2 : Clock;

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted 
                    ? 'bg-eco-green border-eco-green text-white' 
                    : isActive 
                      ? 'bg-white/10 border-eco-green text-eco-green animate-pulse' 
                      : 'bg-white/5 border-white/10 text-text-light/40'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                {i < timeline.length - 1 && (
                  <div className={`w-0.5 h-6 my-1 ${isCompleted ? 'bg-eco-green/40' : 'bg-white/10'}`} />
                )}
              </div>
              <div className="pt-1.5">
                <p className={`text-sm font-semibold ${
                  isCompleted ? 'text-eco-green' : isActive ? 'text-white' : 'text-text-light/40'
                }`}>
                  {step.label}
                </p>
                <p className={`text-xs ${
                  isCompleted ? 'text-eco-green/60' : isActive ? 'text-text-light' : 'text-text-light/20'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RiderOverview() {
  const [rider, setRider] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch rider profile and unified task list (merged recycling pickups + store deliveries)
      const [{ data: profileData }, { data: allTasksData }] = await Promise.all([
        riderApi.profile(),
        riderApi.tasks(),
      ]);
      setRider(profileData);
      
      // Separate tasks into pickups and deliveries based on the 'type' field
      // Pickup tasks have type='pickup', delivery orders have type='delivery'
      const pickupTasks = allTasksData.filter((t) => t.type === 'pickup');
      const deliveryOrders = allTasksData.filter((t) => t.type === 'delivery');
      
      // Store all tasks (will be used for the unified tasks list if displayed)
      setTasks(pickupTasks);
      
      // Store delivery orders separately (for the delivery section UI)
      setDeliveryOrders(deliveryOrders);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  // Real-time socket for order and request updates
  useEffect(() => {
    const socket = getSocket();
    
    // Handle store order status changes (rider_assigned, out_for_delivery, delivered, etc.)
    const handleOrderUpdate = (data) => {
      // Update delivery orders if the order's rider matches the current rider
      setDeliveryOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId
            ? { ...o, orderStatus: data.orderStatus }
            : o
        ).filter((o) => ['rider_assigned', 'out_for_delivery'].includes(o.orderStatus))
      );
      // Update selected order if it's the one that changed
      setSelectedOrder((prev) =>
        prev?.id === data.orderId ? { ...prev, orderStatus: data.orderStatus } : prev
      );
    };
    
    // Handle recycling request status changes (rider_assigned, rider_on_pickup, rider_picked_up, etc.)
    const handleRequestUpdate = async (data) => {
      // If this request is assigned to current rider, refresh unified tasks list
      // (which includes both pickups and deliveries)
      const { data: allTasksData } = await riderApi.tasks();
      const pickupTasks = allTasksData.filter((t) => t.type === 'pickup');
      const deliveryOrders = allTasksData.filter((t) => t.type === 'delivery');
      
      setTasks(pickupTasks);
      setDeliveryOrders(deliveryOrders);
      
      // Update selected task if it's the one that changed
      setSelectedTask((prev) => 
        prev?.id === data.requestId 
          ? pickupTasks.find(t => t.id === data.requestId) 
          : prev
      );
    };
    
    socket.on('order_status_changed', handleOrderUpdate);
    socket.on('request_status_changed', handleRequestUpdate);
    return () => {
      socket.off('order_status_changed', handleOrderUpdate);
      socket.off('request_status_changed', handleRequestUpdate);
    };
  }, []);

  const updateAvailability = async (status) => {
    try {
      const { data } = await riderApi.updateAvailability(status);
      setRider(data);
      toast.success(`Availability updated to ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'rider_assigned':
      case 'return_rider_assigned':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'rider_on_pickup':
      case 'return_on_way':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'rider_picked_up':
      case 'product_returned':
      case 'waste_received':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default:
        return 'bg-white/10 text-text-light border border-white/10';
    }
  };

  const getStatusBadgeLabel = (status) => {
    return status.replace(/_/g, ' ');
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    setActionLoading(true);
    try {
      const apiCall = ['return_on_way', 'product_returned'].includes(status)
        ? requestApi.riderReturnStatus
        : requestApi.riderPickupStatus;
        
      const res = await apiCall(taskId, status);
      setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(res.data);
      }
      toast.success(getToastMessage(status));
      
      // Reload profile to refresh availability status and stats
      const { data: profileData } = await riderApi.profile();
      setRider(profileData);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, action) => {
    setActionLoading(true);
    try {
      const fn = action === 'out_for_delivery' ? orderApi.outForDelivery : orderApi.deliver;
      const { data } = await fn(orderId);
      setDeliveryOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data : o))
          .filter((o) => ['rider_assigned', 'out_for_delivery'].includes(o.orderStatus))
      );
      setSelectedOrder(null);
      toast.success(action === 'out_for_delivery' ? 'You are delivering the order!' : 'Order delivered successfully!');
      const { data: profileData } = await riderApi.profile();
      setRider(profileData);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter tasks to show active ones (assigned, on pickup, picked up, etc.)
  const activeTasks = tasks.filter((t) => 
    ['rider_assigned', 'rider_on_pickup', 'rider_picked_up', 'return_rider_assigned', 'return_on_way'].includes(t.status)
  );

  const completedCount = tasks.filter((t) => 
    ['waste_received', 'product_returned'].includes(t.status)
  ).length;

  const stats = [
    { label: 'Active Tasks', value: String(activeTasks.length), icon: ListOrdered, color: 'text-sky-blue', bg: 'bg-sky-blue/10' },
    { label: 'Completed', value: String(rider?.recycleCount || completedCount), icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10' },
    { label: 'Wallet Balance', value: `$${(rider?.walletBalance || 0).toFixed(2)}`, icon: DollarSign, color: 'text-yellow-accent', bg: 'bg-yellow-accent/10' },
    { label: 'Active Deliveries', value: String(deliveryOrders.length), icon: Truck, color: 'text-soft-orange', bg: 'bg-soft-orange/10' },
  ];

  const recentTasks = activeTasks.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Welcome back, {rider?.name?.split(' ')[0] || 'Rider'}!</h1>
        <p className="text-text-light text-sm mt-1">Manage your assigned pickups and delivery tasks.</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-text-light">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Tasks and Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 glass-card flex flex-col">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-eco-green" /> Active Tasks
            </h2>
            <Link
              to="/rider/dashboard/tasks"
              className="text-sm text-eco-green hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-4">
              {recentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-text-light text-sm">No active tasks right now.</p>
                  <p className="text-text-light/50 text-xs mt-1">Set your availability to "Active" to receive tasks.</p>
                </div>
              ) : (
                recentTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium mb-2 inline-block ${getStatusColor(task.status)}`}>
                          {getStatusBadgeLabel(task.status)}
                        </span>
                        <h3 className="text-sm font-medium text-white">
                          {task.category} • {task.quantity}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-text-light mt-1">
                          <MapPin className="w-3.5 h-3.5 text-sky-blue" />
                          <span className="truncate max-w-xs">{task.address}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                          className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigation & Deliveries */}
        <div className="space-y-6">
          {/* Quick Navigation */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-white font-semibold text-base border-b border-white/10 pb-2">Quick Navigation</h3>
            
            <div className="grid grid-cols-1 gap-3">
              <Link
                to="/rider/dashboard/tasks"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-eco-green/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-eco-green/10 rounded-lg">
                    <ListOrdered className="w-5 h-5 text-eco-green" />
                  </div>
                  <div>
                    <span className="text-white font-semibold text-sm block">All Tasks</span>
                    <span className="text-text-light text-[10px]">Track your pickup histories</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-light" />
              </Link>

              <Link
                to="/rider/dashboard/profile"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-eco-green/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-blue/10 rounded-lg">
                    <User className="w-5 h-5 text-sky-blue" />
                  </div>
                  <div>
                    <span className="text-white font-semibold text-sm block">Profile</span>
                    <span className="text-text-light text-[10px]">Edit availability & settings</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-light" />
              </Link>
            </div>
          </div>

          {/* Active Deliveries */}
          <div className="glass-card flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-sky-400" /> Store Deliveries
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {deliveryOrders.length === 0 ? (
                  <p className="text-center text-text-light py-4">No deliveries assigned.</p>
                ) : (
                  deliveryOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium mb-2 inline-block ${
                            order.orderStatus === 'rider_assigned'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {order.orderStatus === 'rider_assigned' ? 'Assigned' : 'Out for Delivery'}
                          </span>
                          <h3 className="text-sm font-medium text-white">
                            {order.product?.title || 'Store Product'}
                          </h3>
                          <p className="text-xs text-text-light mt-1">For: {order.buyer?.name}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                          className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal / Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Task Details</h2>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="p-1 rounded-lg hover:bg-white/5 text-text-light hover:text-white"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                {selectedTask.image && (
                  <div className="w-full h-44 rounded-xl overflow-hidden mb-4 border border-white/10 bg-white/5">
                    <img src={selectedTask.image} alt="Waste image" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Status Timeline */}
                <StatusTimeline 
                  currentStatus={selectedTask.status} 
                  isReturn={['return_rider_assigned', 'return_on_way', 'product_returned'].includes(selectedTask.status)} 
                />

                <div className="space-y-4">
                  {/* Category and Qty */}
                  <div>
                    <span className="text-[10px] text-text-light uppercase tracking-wider block">Recycling request</span>
                    <h3 className="text-lg font-bold text-white">{selectedTask.category} ({selectedTask.quantity})</h3>
                  </div>

                  {/* Addresses */}
                  <div className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <MapPin className="w-5 h-5 text-eco-green flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-text-light font-semibold block">Pickup/Delivery Address</span>
                      <p className="text-sm text-white mt-0.5">{selectedTask.address}</p>
                    </div>
                  </div>

                  {/* Users */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-text-light uppercase tracking-wider block">User</span>
                      <span className="text-sm font-semibold text-white block mt-0.5">{selectedTask.user?.name || 'User'}</span>
                      <span className="text-xs text-text-light block truncate">{selectedTask.user?.email}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-text-light uppercase tracking-wider block">Vendor</span>
                      <span className="text-sm font-semibold text-white block mt-0.5">{selectedTask.vendor?.name || 'Vendor'}</span>
                      <span className="text-xs text-text-light block truncate">{selectedTask.vendor?.email}</span>
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-text-light font-semibold">Estimated Reward</span>
                    <span className="text-base font-bold text-eco-green">${selectedTask.estimatedReward}</span>
                  </div>

                  {/* Notes */}
                  {selectedTask.notes && (
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-xs text-text-light font-semibold block">Notes</span>
                      <p className="text-xs text-text-light/90 mt-1">{selectedTask.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                {getButtonLabel(selectedTask.status) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      const nextStatus = {
                        'rider_assigned': 'rider_on_pickup',
                        'rider_on_pickup': 'rider_picked_up',
                        'rider_picked_up': 'waste_received',
                        'return_rider_assigned': 'return_on_way',
                        'return_on_way': 'product_returned',
                      }[selectedTask.status];
                      if (nextStatus) {
                        handleUpdateTaskStatus(selectedTask.id, nextStatus);
                      }
                    }}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : getButtonLabel(selectedTask.status)}
                  </button>
                )}

                {['waste_received', 'product_returned'].includes(selectedTask.status) && (
                  <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center">
                    <span className="text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" /> Task Completed!
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Store Order Drawer */}
        <StoreOrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAction={handleUpdateOrderStatus}
          actionLoading={actionLoading}
        />
      </AnimatePresence>
    </motion.div>
  );
}

// Store Delivery Order Drawer appended below RiderOverview
function StoreOrderDrawer({ order, onClose, onAction, actionLoading }) {
  if (!order) return null;

  const STORE_DELIVERY_TIMELINE = [
    { key: 'rider_assigned', label: 'Delivery Assigned', description: 'Delivery has been assigned to you' },
    { key: 'out_for_delivery', label: 'Out for Delivery', description: 'You are delivering the order' },
    { key: 'delivered', label: 'Order Delivered', description: 'Order delivered successfully' },
  ];

  const currentIndex = STORE_DELIVERY_TIMELINE.findIndex(step => step.key === order.orderStatus);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full flex flex-col justify-between overflow-y-auto"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Store Delivery</h2>
              <button onClick={onClose} className="p-1 text-text-light hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Store Delivery Timeline */}
            <div className="mb-6">
              <p className="text-xs text-text-light font-semibold uppercase tracking-wider mb-3">Delivery Progress</p>
              <div className="space-y-2">
                {STORE_DELIVERY_TIMELINE.map((step, i) => {
                  const isCompleted = i < currentIndex;
                  const isActive = i === currentIndex;
                  const Icon = isCompleted ? CheckCircle2 : Clock;

                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted 
                            ? 'bg-eco-green border-eco-green text-white' 
                            : isActive 
                              ? 'bg-white/10 border-eco-green text-eco-green animate-pulse' 
                              : 'bg-white/5 border-white/10 text-text-light/40'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {i < STORE_DELIVERY_TIMELINE.length - 1 && (
                          <div className={`w-0.5 h-6 my-1 ${isCompleted ? 'bg-eco-green/40' : 'bg-white/10'}`} />
                        )}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-semibold ${
                          isCompleted ? 'text-eco-green' : isActive ? 'text-white' : 'text-text-light/40'
                        }`}>
                          {step.label}
                        </p>
                        <p className={`text-xs ${
                          isCompleted ? 'text-eco-green/60' : isActive ? 'text-text-light' : 'text-text-light/20'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-xs text-text-light">Product</p>
                <p className="text-white font-semibold mt-0.5">{order.product?.title}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-xs text-text-light">Buyer</p>
                <p className="text-white font-semibold mt-0.5">{order.buyer?.name}</p>
                <p className="text-xs text-text-light">{order.buyer?.email}</p>
              </div>
              {order.shippingAddress && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-xs text-text-light">Delivery Address</p>
                  <p className="text-white text-sm mt-0.5">{order.shippingAddress}</p>
                </div>
              )}
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between">
                <span className="text-xs text-text-light">Amount</span>
                <span className="text-white font-bold">${order.amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {order.orderStatus === 'rider_assigned' && (
              <button
                disabled={actionLoading}
                onClick={() => onAction(order.id, 'out_for_delivery')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Start Delivery
              </button>
            )}
            {order.orderStatus === 'out_for_delivery' && (
              <button
                disabled={actionLoading}
                onClick={() => onAction(order.id, 'deliver')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark as Delivered
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
