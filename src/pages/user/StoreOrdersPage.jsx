import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Banknote, Wallet, Package, Truck, CheckCircle2, Clock, XCircle, Loader2, Star } from 'lucide-react';
import { orderApi, reviewApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../lib/socket';
import { toast } from 'sonner';
import { ReviewModal } from '../../components/ReviewModal';

const STATUS_PIPELINE = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  { key: 'processing', label: 'Processing', icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  { key: 'rider_assigned', label: 'Rider Assigned', icon: Truck, color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10 border-eco-green/20' },
];

function getStatusInfo(status) {
  return (
    STATUS_PIPELINE.find((s) => s.key === status) || {
      key: status,
      label: status === 'cancelled' ? 'Cancelled' : status,
      icon: XCircle,
      color: status === 'cancelled' ? 'text-red-400' : 'text-text-light',
      bg: status === 'cancelled' ? 'bg-red-400/10 border-red-400/20' : 'bg-white/5 border-white/10',
    }
  );
}

function StatusBadge({ status }) {
  const info = getStatusInfo(status);
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${info.color} ${info.bg}`}>
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

function StatusTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
        <XCircle className="w-4 h-4" /> Order Cancelled
      </div>
    );
  }
  const currentIdx = STATUS_PIPELINE.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-1 mt-3 flex-wrap">
      {STATUS_PIPELINE.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
              done ? 'bg-eco-green/10 border-eco-green/30 text-eco-green' :
              active ? 'bg-white/10 border-white/20 text-white font-semibold' :
              'bg-white/3 border-white/5 text-text-light/40'
            }`}>
              {step.label}
            </div>
            {i < STATUS_PIPELINE.length - 1 && (
              <div className={`h-px w-3 ${done ? 'bg-eco-green/40' : 'bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function StoreOrdersPage() {
  const { currentUser } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [cancelLoading, setCancelLoading] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set());

  const loadPurchases = useCallback(async () => {
    if (currentUser?.role === 'user') {
      const { data } = await orderApi.my();
      setPurchases(data);
    }
  }, [currentUser]);

  const loadSales = useCallback(async () => {
    const { data } = await orderApi.sales();
    setSales(data);
  }, []);

  useEffect(() => {
    loadPurchases();
    loadSales();
    // Load pending reviews to check which orders have been reviewed
    reviewApi.pending().then(({ data }) => {
      const reviewed = data.filter(p => p.orderId).map(p => p.orderId);
      setReviewedOrderIds(new Set(reviewed));
    }).catch(() => {});
  }, [loadPurchases, loadSales]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    const handleOrderUpdate = (data) => {
      setPurchases((prev) =>
        prev.map((o) =>
          o.id === data.orderId
            ? { ...o, orderStatus: data.orderStatus, paymentStatus: data.paymentStatus }
            : o
        )
      );
      setSales((prev) =>
        prev.map((o) =>
          o.id === data.orderId
            ? { ...o, orderStatus: data.orderStatus, paymentStatus: data.paymentStatus }
            : o
        )
      );
      setSelectedOrder((prev) =>
        prev?.id === data.orderId
          ? { ...prev, orderStatus: data.orderStatus, paymentStatus: data.paymentStatus }
          : prev
      );
    };
    socket.on('order_status_changed', handleOrderUpdate);
    return () => socket.off('order_status_changed', handleOrderUpdate);
  }, []);

  const handleCancel = async (orderId) => {
    setCancelLoading(orderId);
    try {
      const { data } = await orderApi.cancelOrder(orderId);
      setPurchases((prev) => prev.map((o) => (o.id === orderId ? data : o)));
      setSelectedOrder(null);
      toast.success('Order cancelled successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(null);
    }
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      await reviewApi.create({
        vendorId: selectedOrder.vendorId,
        orderId: selectedOrder.id,
        productId: selectedOrder.product?.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setReviewedOrderIds(prev => new Set([...prev, selectedOrder.id]));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
      throw err;
    }
  };

  const isOrderReviewable = (order) => {
    return order.orderStatus === 'delivered' && !reviewedOrderIds.has(order.id);
  };

  const renderPurchases = (orders) => (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-eco-green" /> My Purchases
        </h2>
        <p className="text-xs text-text-light mt-1">Track your store orders in real-time</p>
      </div>
      <div className="divide-y divide-white/5">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-text-light">No purchases yet.</p>
          </div>
        ) : (
          orders.map((o) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedOrder(o)}
              className="p-5 hover:bg-white/3 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">#{o.id.slice(-6).toUpperCase()}</span>
                    <StatusBadge status={o.orderStatus} />
                  </div>
                  <p className="text-text-light text-xs truncate">{o.product?.title || 'Store Product'}</p>
                  <StatusTimeline status={o.orderStatus} />
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white font-bold">${o.amount?.toFixed(2)}</p>
                  <div className="flex items-center gap-1 text-xs text-text-light mt-1">
                    {o.paymentMethod === 'wallet' ? <Wallet className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                    {o.paymentMethod?.toUpperCase()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderSalesTable = (orders, title) => (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-xs text-text-light mt-1">Products you submitted as waste that were sold</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs text-text-light bg-white/5">
              <th className="p-4">Order</th>
              <th className="p-4">Product</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Your Share</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-text-light">No sales yet</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="p-4 text-sm text-white font-medium">#{o.id.slice(-6).toUpperCase()}</td>
                  <td className="p-4 text-sm text-text-light">{o.product?.title || '—'}</td>
                  <td className="p-4 text-sm text-white">${o.amount?.toFixed(2)}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-1">
                      {o.paymentMethod === 'wallet' ? <Wallet className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                      {o.paymentMethod?.toUpperCase()}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-eco-green font-semibold">
                    ${(o.commission?.user || 0).toFixed(2)}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={o.orderStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <ShoppingBag className="w-7 h-7 text-eco-green" /> Store Orders
      </h1>

      {currentUser?.role === 'user' && (
        <>
          {renderPurchases(purchases)}
          {renderSalesTable(sales, 'My Product Sales (Waste Owner Share)')}
        </>
      )}
      {currentUser?.role === 'vendor' && renderSalesTable(sales, 'Store Sales')}

      {/* Order Detail Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Order #{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-1 text-text-light hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="glass-card p-4">
                  <p className="text-xs text-text-light mb-1">Product</p>
                  <p className="text-white font-semibold">{selectedOrder.product?.title || 'Store Product'}</p>
                </div>

                <div className="glass-card p-4">
                  <p className="text-xs text-text-light mb-2">Delivery Status</p>
                  <StatusTimeline status={selectedOrder.orderStatus} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-xs text-text-light">Amount</p>
                    <p className="text-white font-bold mt-1">${selectedOrder.amount?.toFixed(2)}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-xs text-text-light">Payment</p>
                    <p className="text-white font-medium mt-1 capitalize">{selectedOrder.paymentMethod}</p>
                  </div>
                </div>

                {selectedOrder.shippingAddress && (
                  <div className="glass-card p-4">
                    <p className="text-xs text-text-light mb-1">Shipping Address</p>
                    <p className="text-white text-sm">{selectedOrder.shippingAddress}</p>
                  </div>
                )}

                {selectedOrder.rider && (
                  <div className="glass-card p-4">
                    <p className="text-xs text-text-light mb-1">Delivery Rider</p>
                    <p className="text-white font-medium">{selectedOrder.rider.name}</p>
                  </div>
                )}

                {['pending', 'processing'].includes(selectedOrder.orderStatus) && (
                  <button
                    onClick={() => handleCancel(selectedOrder.id)}
                    disabled={cancelLoading === selectedOrder.id}
                    className="btn-secondary w-full text-red-400 flex items-center justify-center gap-2 mt-4"
                  >
                    {cancelLoading === selectedOrder.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Cancel Order
                  </button>
                )}

                {isOrderReviewable(selectedOrder) && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="btn-primary w-full flex items-center justify-center gap-2 mt-4 bg-eco-green hover:bg-eco-green/90"
                  >
                    <Star className="w-4 h-4" />
                    Write Review
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        vendorName={selectedOrder?.vendorId?.name || 'Vendor'}
        onSubmit={handleSubmitReview}
      />
    </motion.div>
  );
}
