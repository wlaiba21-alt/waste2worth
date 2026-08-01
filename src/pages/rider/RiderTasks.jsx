import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Eye, 
  Play, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  User, 
  Building, 
  Hash,
  X,
  Loader2,
  Package,
  ChevronRight,
  AlertCircle,
  Truck,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
// FIXED: Import riderApi (for unified /rider/tasks endpoint) in addition to requestApi and orderApi
import { requestApi, riderApi, orderApi } from '../../api';
import { getSocket } from '../../lib/socket';

// Timeline definitions for recycling pickup tasks
const PICKUP_TIMELINE = [
  { key: 'rider_assigned', label: 'Pickup Assigned', description: 'Task has been assigned to you' },
  { key: 'rider_on_pickup', label: 'Pickup Started', description: 'You are on the way to pickup' },
  { key: 'rider_picked_up', label: 'Order Picked Up', description: 'You have picked up the order' },
  { key: 'waste_received', label: 'Delivered', description: 'Order delivered to vendor' },
];

// Timeline definitions for recycling return tasks
const RETURN_TIMELINE = [
  { key: 'return_rider_assigned', label: 'Return Assigned', description: 'Return task has been assigned to you' },
  { key: 'return_on_way', label: 'Return Started', description: 'You are on the way to deliver the return' },
  { key: 'product_returned', label: 'Return Completed', description: 'Product returned to user' },
];

// Timeline definitions for store delivery orders
const STORE_DELIVERY_TIMELINE = [
  { key: 'rider_assigned', label: 'Delivery Assigned', description: 'Delivery has been assigned to you' },
  { key: 'out_for_delivery', label: 'Out for Delivery', description: 'You are delivering the order' },
  { key: 'delivered', label: 'Order Delivered', description: 'Order delivered successfully' },
];

const getToastMessage = (status) => {
  switch (status) {
    case 'rider_on_pickup': return 'You have started pickup';
    case 'rider_picked_up': return 'Order picked up successfully';
    case 'waste_received': return 'Order delivered successfully';
    case 'return_on_way': return 'You have started return delivery';
    case 'product_returned': return 'Return completed successfully';
    case 'out_for_delivery': return 'You are now out for delivery!';
    case 'deliver': return 'Order delivered successfully!';
    default: return 'Status updated successfully!';
  }
};

// StatusTimeline: renders a visual progress tracker for a given task type
function StatusTimeline({ currentStatus, isReturn, isDelivery }) {
  // FIXED: Choose the correct timeline based on task type
  let timeline = PICKUP_TIMELINE;
  if (isReturn) timeline = RETURN_TIMELINE;
  if (isDelivery) timeline = STORE_DELIVERY_TIMELINE;

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

// getStatusDisplay: maps task status strings to display labels and CSS classes
const getStatusDisplay = (status) => {
  switch (status) {
    case 'rider_assigned':
    case 'return_rider_assigned':
      return { label: 'Pending', class: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
    case 'rider_on_pickup':
    case 'return_on_way':
    case 'out_for_delivery':
      return { label: 'In Progress', class: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
    case 'rider_picked_up':
      return { label: 'Picked Up', class: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' };
    case 'waste_received':
    case 'product_returned':
    case 'delivered':
      return { label: 'Completed', class: 'bg-green-500/20 text-green-400 border border-green-500/30' };
    default:
      return { label: status, class: 'bg-white/10 text-text-light border border-white/10' };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

// PickupTaskCard: card for recycling pickup/return tasks (from RecyclingRequest collection)
const PickupTaskCard = ({ req, onViewDetails, onUpdateStatus, actionLoading }) => {
  const statusInfo = getStatusDisplay(req.status);
  const isReturn = ['return_rider_assigned', 'return_on_way', 'product_returned'].includes(req.status);

  const actions = useMemo(() => {
    switch (req.status) {
      case 'rider_assigned':
        return [{ label: 'Start Task', action: 'rider_on_pickup', variant: 'primary', icon: Play }];
      case 'rider_on_pickup':
        return [{ label: 'Mark as Picked Up', action: 'rider_picked_up', variant: 'primary', icon: CheckCircle2 }];
      case 'rider_picked_up':
        return [{ label: 'Mark as Delivered', action: 'waste_received', variant: 'primary', icon: CheckCircle2 }];
      case 'return_rider_assigned':
        return [{ label: 'Start Return', action: 'return_on_way', variant: 'primary', icon: Play }];
      case 'return_on_way':
        return [{ label: 'Mark as Returned', action: 'product_returned', variant: 'primary', icon: CheckCircle2 }];
      default:
        return [];
    }
  }, [req.status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden group"
    >
      <div className="p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
                <Hash className="w-4 h-4 text-eco-green" />
                <span className="text-sm font-mono font-semibold text-white">#{req.id?.slice(-8)}</span>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.class}`}>
                {statusInfo.label}
              </span>
              {/* Badge to distinguish pickup vs return tasks */}
              {isReturn ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Package className="w-3.5 h-3.5" />
                  Return Task
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-eco-green/20 text-eco-green border border-eco-green/30">
                  <Truck className="w-3.5 h-3.5" />
                  Pickup Task
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <User className="w-3.5 h-3.5" />
                  User
                </div>
                <p className="text-white font-medium truncate">{req.user?.name || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <Building className="w-3.5 h-3.5" />
                  Vendor
                </div>
                <p className="text-white font-medium truncate">{req.vendor?.name || 'N/A'}</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5" />
                  Address
                </div>
                <p className="text-text-light text-sm truncate">{req.address || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5" />
                  Created
                </div>
                <p className="text-text-light text-sm">{formatDate(req.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="flex lg:flex-col items-center gap-2 lg:gap-3 shrink-0">
            <button
              onClick={onViewDetails}
              className="btn-secondary px-4 py-2.5 text-sm font-medium flex items-center gap-2 w-full lg:w-auto justify-center"
            >
              <Eye className="w-4 h-4" />
              View Details
              <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.action}
                  onClick={() => onUpdateStatus(req.id, action.action, 'pickup')}
                  disabled={actionLoading === req.id}
                  className={`${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'} px-4 py-2.5 text-sm font-medium flex items-center gap-2 w-full lg:w-auto justify-center`}
                >
                  {actionLoading === req.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// FIXED: New card component for store delivery orders (from StoreOrder collection)
// These have different fields: orderStatus, product, buyer, shippingAddress, amount
const DeliveryOrderCard = ({ order, onViewDetails, onUpdateStatus, actionLoading }) => {
  // Store delivery orders use 'orderStatus' field (not 'status')
  const statusInfo = getStatusDisplay(order.orderStatus);

  const actions = useMemo(() => {
    switch (order.orderStatus) {
      case 'rider_assigned':
        return [{ label: 'Start Delivery', action: 'out_for_delivery', variant: 'primary', icon: Truck }];
      case 'out_for_delivery':
        return [{ label: 'Mark as Delivered', action: 'deliver', variant: 'primary', icon: CheckCircle2 }];
      default:
        return [];
    }
  }, [order.orderStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden group border border-sky-500/20"
    >
      <div className="p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
                <Hash className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-mono font-semibold text-white">#{order.id?.slice(-8)}</span>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.class}`}>
                {statusInfo.label}
              </span>
              {/* Badge clearly marking this as a store delivery */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <ShoppingBag className="w-3.5 h-3.5" />
                Store Delivery
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {/* Product title (store orders have a product, not a category) */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <Package className="w-3.5 h-3.5" />
                  Product
                </div>
                <p className="text-white font-medium truncate">{order.product?.title || 'Store Product'}</p>
              </div>

              {/* Buyer name (store orders deliver to a buyer, not a user/vendor pair) */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <User className="w-3.5 h-3.5" />
                  Buyer
                </div>
                <p className="text-white font-medium truncate">{order.buyer?.name || 'N/A'}</p>
              </div>

              {/* Shipping address for store deliveries */}
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5" />
                  Delivery Address
                </div>
                <p className="text-text-light text-sm truncate">{order.shippingAddress || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5" />
                  Created
                </div>
                <p className="text-text-light text-sm">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="flex lg:flex-col items-center gap-2 lg:gap-3 shrink-0">
            <button
              onClick={onViewDetails}
              className="btn-secondary px-4 py-2.5 text-sm font-medium flex items-center gap-2 w-full lg:w-auto justify-center"
            >
              <Eye className="w-4 h-4" />
              View Details
              <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.action}
                  // FIXED: Pass 'delivery' type flag so the handler calls the correct API
                  onClick={() => onUpdateStatus(order.id, action.action, 'delivery')}
                  disabled={actionLoading === order.id}
                  className={`${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'} px-4 py-2.5 text-sm font-medium flex items-center gap-2 w-full lg:w-auto justify-center`}
                >
                  {actionLoading === order.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export function RiderTasks() {
  // FIXED: Unified task list holds both pickup tasks and store delivery orders
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  // FIXED: Use riderApi.tasks() which calls GET /rider/tasks
  // This endpoint merges RecyclingRequest (pickup/return) and StoreOrder (delivery) into one list
  // Each item has a 'type' field: 'pickup' for recycling tasks, 'delivery' for store orders
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await riderApi.tasks();
      setTasks(data);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Real-time socket: refresh task list when any request or order status changes
  useEffect(() => {
    const socket = getSocket();

    // Handle recycling request status changes
    const handleRequestUpdate = async (data) => {
      const { data: tasksData } = await riderApi.tasks();
      setTasks(tasksData);
      // Update selected drawer if it was the changed item
      setSelected((prev) => prev?.id === data.requestId ? tasksData.find(t => t.id === data.requestId) || null : prev);
    };

    // FIXED: Also handle store order status changes (order_status_changed event)
    const handleOrderUpdate = async (data) => {
      const { data: tasksData } = await riderApi.tasks();
      setTasks(tasksData);
      // Update selected drawer if it was the changed order
      setSelected((prev) => prev?.id === data.orderId ? tasksData.find(t => t.id === data.orderId) || null : prev);
    };

    socket.on('request_status_changed', handleRequestUpdate);
    socket.on('order_status_changed', handleOrderUpdate);
    return () => {
      socket.off('request_status_changed', handleRequestUpdate);
      socket.off('order_status_changed', handleOrderUpdate);
    };
  }, []);

  // Filter tasks by the selected filter tab and search query
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // FIXED: Determine active status field based on task type
      // Pickup tasks use 'status', delivery orders use 'orderStatus'
      const activeStatus = task.type === 'delivery' ? task.orderStatus : task.status;

      const matchesStatus =
        filter === 'All' ||
        filter === task.type || // 'pickup' or 'delivery' type filter
        activeStatus === filter;

      const matchesSearch =
        searchQuery === '' ||
        task.id?.toString().includes(searchQuery) ||
        // Pickup task fields
        task.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        // Delivery order fields
        task.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.product?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.shippingAddress?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [tasks, filter, searchQuery]);

  // FIXED: Unified status update handler that routes to the correct API based on task type
  const handleUpdateStatus = async (taskId, action, taskType) => {
    setActionLoading(taskId);
    try {
      if (taskType === 'delivery') {
        // Store delivery orders use order-specific API endpoints
        const fn = action === 'out_for_delivery' ? orderApi.outForDelivery : orderApi.deliver;
        const { data } = await fn(taskId);
        // Replace the updated order in the task list
        setTasks(prev => prev.map(t => t.id === taskId ? { ...data, type: 'delivery' } : t));
        if (selected?.id === taskId) setSelected({ ...data, type: 'delivery' });
      } else {
        // Recycling pickup/return tasks use request-specific API endpoints
        const apiCall = ['return_on_way', 'product_returned'].includes(action)
          ? requestApi.riderReturnStatus
          : requestApi.riderPickupStatus;
        const res = await apiCall(taskId, action);
        setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
        if (selected?.id === taskId) setSelected(res.data);
      }
      toast.success(getToastMessage(action));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
      </div>
    );
  }

  // Count tasks by type for display in the header
  const pickupCount = tasks.filter(t => t.type === 'pickup').length;
  const deliveryCount = tasks.filter(t => t.type === 'delivery').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Assigned Tasks</h1>
          {/* FIXED: Show counts for both task types */}
          <p className="text-text-light mt-1">
            {pickupCount} pickup task{pickupCount !== 1 ? 's' : ''} · {deliveryCount} store deliver{deliveryCount !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
            <input
              type="text"
              placeholder="Search by ID, name, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-10"
            />
          </div>
          
          {/* FIXED: Filter dropdown now includes store delivery statuses */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="glass-input"
          >
            <option value="All">All Tasks</option>
            <optgroup label="── Recycling Pickups ──">
              <option value="rider_assigned">Pickup Pending</option>
              <option value="rider_on_pickup">Pickup In Progress</option>
              <option value="rider_picked_up">Picked Up</option>
              <option value="waste_received">Pickup Completed</option>
            </optgroup>
            <optgroup label="── Return Tasks ──">
              <option value="return_rider_assigned">Return Pending</option>
              <option value="return_on_way">Return In Progress</option>
              <option value="product_returned">Return Completed</option>
            </optgroup>
            {/* FIXED: New filter options for store delivery orders */}
            <optgroup label="── Store Deliveries ──">
              <option value="delivery">All Deliveries</option>
              <option value="out_for_delivery">Out for Delivery</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => {
          // FIXED: Render the correct card based on task.type
          // type='delivery' → DeliveryOrderCard (store orders)
          // type='pickup' → PickupTaskCard (recycling requests)
          if (task.type === 'delivery') {
            return (
              <DeliveryOrderCard
                key={task.id}
                order={task}
                onViewDetails={() => setSelected(task)}
                onUpdateStatus={handleUpdateStatus}
                actionLoading={actionLoading}
              />
            );
          }
          return (
            <PickupTaskCard
              key={task.id}
              req={task}
              onViewDetails={() => setSelected(task)}
              onUpdateStatus={handleUpdateStatus}
              actionLoading={actionLoading}
            />
          );
        })}

        {filteredTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <AlertCircle className="w-8 h-8 text-text-light/40" />
              </div>
              <h3 className="text-lg font-semibold text-white">No tasks found</h3>
              <p className="text-text-light">No tasks match your search or filter criteria.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Detail Drawer: renders different content for pickup vs delivery tasks */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {/* FIXED: Show appropriate title based on task type */}
                  {selected.type === 'delivery' ? 'Store Delivery Details' : 'Task Details'}
                </h2>
                <button 
                  onClick={() => setSelected(null)} 
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-text-light" />
                </button>
              </div>

              {/* Show image for recycling pickup tasks */}
              {selected.type !== 'delivery' && selected.image && (
                <img src={selected.image} alt="Waste item" className="w-full h-48 object-cover rounded-xl mb-5 border border-white/10" />
              )}

              {/* FIXED: Render the correct timeline based on task type */}
              <StatusTimeline 
                currentStatus={selected.type === 'delivery' ? selected.orderStatus : selected.status}
                isReturn={['return_rider_assigned', 'return_on_way', 'product_returned'].includes(selected.status)}
                isDelivery={selected.type === 'delivery'}
              />

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-text-light font-medium text-sm">Task ID</span>
                  <span className="text-white font-mono">#{selected.id?.slice(-8)}</span>
                </div>

                {/* FIXED: Show relevant fields based on task type */}
                {selected.type === 'delivery' ? (
                  // Store delivery order fields
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Product</span>
                      <span className="text-white">{selected.product?.title || 'Store Product'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Buyer</span>
                      <span className="text-white">{selected.buyer?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Amount</span>
                      <span className="text-white font-bold text-eco-green">${selected.amount?.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-text-light font-medium text-sm block">Delivery Address</span>
                      <span className="text-text-light text-sm">{selected.shippingAddress || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Status</span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getStatusDisplay(selected.orderStatus).class}`}>
                        {getStatusDisplay(selected.orderStatus).label}
                      </span>
                    </div>
                  </>
                ) : (
                  // Recycling pickup/return task fields
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">User</span>
                      <span className="text-white">{selected.user?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Vendor</span>
                      <span className="text-white">{selected.vendor?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Category</span>
                      <span className="text-white">{selected.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Quantity</span>
                      <span className="text-white">{selected.quantity}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-text-light font-medium text-sm block">Address</span>
                      <span className="text-text-light text-sm">{selected.address}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-light font-medium text-sm">Status</span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getStatusDisplay(selected.status).class}`}>
                        {getStatusDisplay(selected.status).label}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-text-light font-medium text-sm">Created At</span>
                  <span className="text-white text-sm">{formatDate(selected.createdAt)}</span>
                </div>
              </div>

              {/* Action buttons in the drawer */}
              <div className="space-y-3">
                {selected.type === 'delivery' ? (
                  // FIXED: Store delivery action buttons
                  <>
                    {selected.orderStatus === 'rider_assigned' && (
                      <button
                        onClick={() => handleUpdateStatus(selected.id, 'out_for_delivery', 'delivery')}
                        disabled={actionLoading === selected.id}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {actionLoading === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                        Start Delivery
                      </button>
                    )}
                    {selected.orderStatus === 'out_for_delivery' && (
                      <button
                        onClick={() => handleUpdateStatus(selected.id, 'deliver', 'delivery')}
                        disabled={actionLoading === selected.id}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {actionLoading === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Mark as Delivered
                      </button>
                    )}
                    {selected.orderStatus === 'delivered' && (
                      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center">
                        <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Delivery Completed!
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  // Recycling pickup/return action buttons
                  (() => {
                    const actionMap = {
                      'rider_assigned': { label: 'Start Task', action: 'rider_on_pickup', icon: Play },
                      'rider_on_pickup': { label: 'Mark as Picked Up', action: 'rider_picked_up', icon: CheckCircle2 },
                      'rider_picked_up': { label: 'Mark as Delivered', action: 'waste_received', icon: CheckCircle2 },
                      'return_rider_assigned': { label: 'Start Return', action: 'return_on_way', icon: Play },
                      'return_on_way': { label: 'Mark as Returned', action: 'product_returned', icon: CheckCircle2 },
                    };
                    const action = actionMap[selected.status];
                    if (action) {
                      const Icon = action.icon;
                      return (
                        <button
                          onClick={() => handleUpdateStatus(selected.id, action.action, 'pickup')}
                          disabled={actionLoading === selected.id}
                          className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                          {actionLoading === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                          {action.label}
                        </button>
                      );
                    }
                    if (['waste_received', 'product_returned'].includes(selected.status)) {
                      return (
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center">
                          <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Task Completed!
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
