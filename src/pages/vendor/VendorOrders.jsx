import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Truck, Package, CheckCircle2, Clock, XCircle, Loader2, Banknote, Wallet, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderApi, riderApi } from '../../api';
import { getSocket } from '../../lib/socket';
import { toast } from 'sonner';

const ORDER_STATUSES = ['All', 'pending', 'processing', 'rider_assigned', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_CONFIG = {
  pending:          { label: 'Pending',          color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/20',  icon: Clock },
  processing:       { label: 'Processing',       color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20',      icon: Package },
  rider_assigned:   { label: 'Rider Assigned',   color: 'text-sky-400',     bg: 'bg-sky-400/10 border-sky-400/20',        icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/20',  icon: Truck },
  delivered:        { label: 'Delivered',        color: 'text-eco-green',   bg: 'bg-eco-green/10 border-eco-green/20',    icon: CheckCircle2 },
  cancelled:        { label: 'Cancelled',        color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',        icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { orderId } = useParams();

  const load = useCallback(async () => {
    try {
      const [{ data: ordersData }, { data: ridersData }] = await Promise.all([
        orderApi.vendorOrders(),
        riderApi.list(),
      ]);
      setOrders(ordersData);
      setRiders(ridersData);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!orders.length) return;

    if (!orderId) {
      setSelected(null);
      return;
    }

    const match = orders.find((o) => String(o.id || o._id) === String(orderId));
    setSelected(match || null);
  }, [orderId, orders]);

  const getOrderKey = (order) => order?.id || order?._id;

  const handleSelectOrder = (order) => {
    const key = getOrderKey(order);
    setSelected(order);
    if (key) {
      navigate(`/vendor/dashboard/orders/${key}`, { replace: true });
    }
  };

  const handleCloseDrawer = () => {
    setSelected(null);
    if (orderId) {
      navigate('/vendor/dashboard/orders', { replace: true });
    }
  };

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = (data) => {
      setOrders((prev) =>
        prev.map((o) =>
          String(getOrderKey(o)) === String(data.orderId)
            ? { ...o, orderStatus: data.orderStatus, paymentStatus: data.paymentStatus, riderId: data.riderId }
            : o
        )
      );
      setSelected((prev) =>
        String(getOrderKey(prev)) === String(data.orderId)
          ? { ...prev, orderStatus: data.orderStatus, paymentStatus: data.paymentStatus }
          : prev
      );
    };
    socket.on('order_status_changed', handleUpdate);
    return () => socket.off('order_status_changed', handleUpdate);
  }, []);

  const availableRiders = riders.filter(
    (r) => r.status === 'active' &&
      (r.displayStatus === 'active' || r.availabilityStatus === 'active' ||
       r.displayStatus === 'available' || r.availabilityStatus === 'available')
  );

  const doAction = async (fn, successMsg) => {
    setActionLoading(true);
    try {
      const { data } = await fn();
      setOrders((prev) => prev.map((o) => (String(getOrderKey(o)) === String(data.id || data._id) ? data : o)));
      setSelected(data);
      const key = getOrderKey(data);
      if (key) {
        navigate(`/vendor/dashboard/orders/${key}`, { replace: true });
      }
      toast.success(successMsg);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcess = () =>
    doAction(() => orderApi.processOrder(selected.id), 'Order marked as processing!');

  const handleAssignRider = (riderId) =>
    doAction(() => orderApi.assignRider(selected.id, riderId), 'Rider assigned!');

  const handleDeliver = () =>
    doAction(() => orderApi.deliver(selected.id), 'Order marked as delivered!');

  const handleConfirmCod = () =>
    doAction(() => orderApi.confirmCod(selected.id), 'COD payment confirmed!');

  const filtered = filter === 'All' ? orders : orders.filter((o) => o.orderStatus === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-eco-green" /> Store Orders
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-light">Total:</span>
          <span className="text-white font-bold">{orders.length} orders</span>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize border transition-all ${
              filter === s ? 'bg-eco-green border-eco-green text-white' : 'border-white/10 text-text-light hover:border-white/20'
            }`}
          >
            {s === 'All' ? 'All' : STATUS_CONFIG[s]?.label || s}
            {s !== 'All' && (
              <span className="ml-1.5 opacity-60">{orders.filter((o) => o.orderStatus === s).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs text-text-light bg-white/5">
                <th className="p-4">Order ID</th>
                <th className="p-4">Product</th>
                <th className="p-4">Buyer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-text-light">No orders found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => handleSelectOrder(o)}
                    className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-sm text-white font-medium">#{o.id.slice(-6).toUpperCase()}</td>
                    <td className="p-4 text-sm text-text-light">{o.product?.title || '—'}</td>
                    <td className="p-4 text-sm text-text-light">{o.buyer?.name || '—'}</td>
                    <td className="p-4 text-sm text-white font-medium">${o.amount?.toFixed(2)}</td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-1 text-text-light">
                        {o.paymentMethod === 'wallet' ? <Wallet className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                        {o.paymentMethod?.toUpperCase()}
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={o.orderStatus} />
                    </td>
                    <td className="p-4">
                      {o.orderStatus === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectOrder(o); }}
                          className="text-xs text-eco-green hover:underline"
                        >
                          Process →
                        </button>
                      )}
                      {o.orderStatus === 'processing' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectOrder(o); }}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Assign Rider →
                        </button>
                      )}
                      {o.orderStatus === 'out_for_delivery' && o.paymentMethod === 'cod' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectOrder(o); }}
                          className="text-xs text-orange-400 hover:underline"
                        >
                          Confirm COD →
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={handleCloseDrawer}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Order #{selected.id.slice(-6).toUpperCase()}</h2>
                  <p className="text-xs text-text-light mt-0.5">{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={handleCloseDrawer} className="p-1 text-text-light hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs text-text-light">Status</span>
                  <StatusBadge status={selected.orderStatus} />
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs text-text-light">Product</span>
                  <span className="text-sm text-white font-medium">{selected.product?.title || '—'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs text-text-light">Amount</span>
                  <span className="text-sm text-white font-bold">${selected.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs text-text-light">Payment</span>
                  <div className="flex items-center gap-1.5 text-sm text-white">
                    {selected.paymentMethod === 'wallet' ? <Wallet className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                    {selected.paymentMethod?.toUpperCase()}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${selected.paymentStatus === 'paid' ? 'bg-eco-green/20 text-eco-green' : 'bg-yellow-400/20 text-yellow-400'}`}>
                      {selected.paymentStatus}
                    </span>
                  </div>
                </div>
                {selected.buyer && (
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-text-light">Buyer</span>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-text-light" />
                      <span className="text-sm text-white">{selected.buyer.name}</span>
                    </div>
                  </div>
                )}
                {selected.rider && (
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-text-light">Rider</span>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-sm text-white">{selected.rider.name}</span>
                    </div>
                  </div>
                )}
                {selected.shippingAddress && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-text-light block mb-1">Shipping Address</span>
                    <span className="text-sm text-white">{selected.shippingAddress}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3 mt-auto">
                {selected.orderStatus === 'pending' && (
                  <button
                    onClick={handleProcess}
                    disabled={actionLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    Confirm & Process Order
                  </button>
                )}

                {selected.orderStatus === 'processing' && (
                  <div>
                    <label className="text-xs text-text-light mb-2 block">Assign Delivery Rider</label>
                    {availableRiders.length === 0 ? (
                      <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                        No available riders right now. Wait for a rider to become available.
                      </div>
                    ) : (
                      <select
                        onChange={(e) => e.target.value && handleAssignRider(e.target.value)}
                        defaultValue=""
                        className="glass-input w-full"
                        disabled={actionLoading}
                      >
                        <option value="" disabled>Select a Rider</option>
                        {availableRiders.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {selected.orderStatus === 'out_for_delivery' && selected.paymentMethod === 'cod' && (
                  <button
                    onClick={handleConfirmCod}
                    disabled={actionLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                    Confirm COD Payment Received
                  </button>
                )}

                {selected.orderStatus === 'rider_assigned' && (
                  <div className="p-3 bg-sky-400/10 border border-sky-400/20 rounded-xl text-center text-xs text-sky-400">
                    Waiting for rider to start delivery…
                  </div>
                )}

                {selected.orderStatus === 'delivered' && (
                  <div className="p-3 bg-eco-green/10 border border-eco-green/20 rounded-xl text-center">
                    <CheckCircle2 className="w-5 h-5 text-eco-green mx-auto mb-1" />
                    <span className="text-eco-green text-sm font-semibold">Order Delivered Successfully</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
