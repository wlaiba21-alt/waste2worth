import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MessageCircle, Clock, CheckCircle2, XCircle, Truck, User,
  Building, ArrowRight, Loader2, Star
} from 'lucide-react';
import { requestApi, chatApi, reviewApi } from '../../api';
import { getSocket } from '../../lib/socket';
import { ReviewModal } from '../../components/ReviewModal';

const STATUS_PIPELINE = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', description: 'Your request has been submitted' },
  { key: 'vendor_accepted', label: 'Vendor Accepted', icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', description: 'Vendor has accepted your request' },
  { key: 'admin_approved', label: 'Approved', icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10 border-eco-green/20', description: 'Admin has approved the request' },
  { key: 'rider_assigned', label: 'Rider Assigned', icon: Truck, color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20', description: 'A rider is on their way to you' },
  { key: 'rider_on_pickup', label: 'Rider is on the way', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', description: 'Rider is heading to pick up your waste' },
  { key: 'rider_picked_up', label: 'Picked Up', icon: CheckCircle2, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', description: 'Waste has been picked up by rider' },
  { key: 'waste_received', label: 'Waste Delivered to Vendor', icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10 border-eco-green/20', description: 'Waste has been delivered to vendor' },
  { key: 'recycling_started', label: 'Recycling Started', icon: Clock, color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20', description: 'Vendor has started recycling your waste' },
  { key: 'recycling_completed', label: 'Recycling Complete', icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10 border-eco-green/20', description: 'Recycling is complete! Choose your option' },
];

const RETURN_STATUS_PIPELINE = [
  { key: 'return_requested', label: 'Return Requested', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', description: 'You requested product return' },
  { key: 'return_rider_assigned', label: 'Return Rider Assigned', icon: Truck, color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20', description: 'Rider assigned for delivery' },
  { key: 'return_on_way', label: 'Return On the Way', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', description: 'Product is being delivered to you' },
  { key: 'product_returned', label: 'Return Complete', icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10 border-eco-green/20', description: 'Product has been returned successfully' },
];

function getStatusInfo(status) {
  const allStatuses = [...STATUS_PIPELINE, ...RETURN_STATUS_PIPELINE, 
    { key: 'vendor_rejected', label: 'Rejected by Vendor', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', description: 'Vendor rejected your request' },
    { key: 'admin_rejected', label: 'Rejected by Admin', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', description: 'Admin rejected the request' },
    { key: 'product_sold', label: 'Product Sold', icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10 border-eco-green/20', description: 'Your recycled product has been sold' },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', description: 'Request was cancelled' }
  ];
  return allStatuses.find(s => s.key === status) || { key: status, label: status, icon: XCircle, color: 'text-text-light', bg: 'bg-white/5 border-white/10', description: status };
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

function StatusTimeline({ status, timestamps }) {
  const isReturnFlow = ['return_requested', 'return_rider_assigned', 'return_on_way', 'product_returned'].includes(status);
  const pipeline = isReturnFlow ? RETURN_STATUS_PIPELINE : STATUS_PIPELINE;
  const currentIdx = pipeline.findIndex((s) => s.key === status);
  
  if (['cancelled', 'vendor_rejected', 'admin_rejected', 'product_sold'].includes(status)) {
    const info = getStatusInfo(status);
    const Icon = info.icon;
    return (
      <div className="flex items-center gap-2 text-xs mt-2">
        <Icon className="w-4 h-4" /> {info.description}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {pipeline.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const Icon = step.icon;
        const timestampKey = {
          'rider_assigned': 'riderAssignedAt',
          'rider_on_pickup': 'riderOnPickupAt',
          'rider_picked_up': 'riderPickedUpAt',
          'waste_received': 'wasteReceivedAt',
          'return_rider_assigned': 'returnRiderAssignedAt',
          'return_on_way': 'returnOnWayAt',
          'product_returned': 'productReturnedAt'
        }[step.key];
        const timestamp = timestamps && timestampKey ? timestamps[timestampKey] : null;
        
        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                done ? 'bg-eco-green border-eco-green text-white' :
                active ? 'bg-white/10 border-eco-green text-eco-green' :
                'bg-white/5 border-white/10 text-text-light/40'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              {i < pipeline.length - 1 && (
                <div className={`w-0.5 h-6 my-1 ${done ? 'bg-eco-green/40' : 'bg-white/10'}`} />
              )}
            </div>
            <div className="pt-1.5">
              <p className={`text-xs font-semibold ${done ? 'text-eco-green' : active ? 'text-white' : 'text-text-light/40'}`}>
                {step.label}
              </p>
              <p className={`text-[10px] ${done ? 'text-eco-green/60' : active ? 'text-text-light' : 'text-text-light/20'}`}>
                {step.description}
              </p>
              {timestamp && (
                <p className="text-[10px] text-text-light/50 mt-0.5">
                  {new Date(timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MyRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [returnAddress, setReturnAddress] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReviewRequestId, setCurrentReviewRequestId] = useState(null);
  const [reviewedRequestIds, setReviewedRequestIds] = useState(new Set());

  const load = () => requestApi.my().then(({ data }) => setRequests(data));

  useEffect(() => {
    load();
    // Load pending reviews to check which requests have been reviewed
    reviewApi.pending().then(({ data }) => {
      const reviewed = data.filter(p => p.requestId).map(p => p.requestId);
      setReviewedRequestIds(new Set(reviewed));
    }).catch(() => {});
  }, []);

  // Real-time socket updates for request status changes
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = (data) => {
      setRequests((prev) =>
        prev.map((r) => r.id === data.requestId ? { ...r, status: data.status } : r)
      );
      setSelected((prev) =>
        prev?.id === data.requestId ? { ...prev, status: data.status } : prev
      );
    };
    socket.on('request_status_changed', handleUpdate);
    return () => socket.off('request_status_changed', handleUpdate);
  }, []);

  const startChat = async () => {
    try {
      const { data } = await chatApi.createThread({ vendorId: selected.vendorId });
      navigate(`/chat/${data.threadId}`);
    } catch (err) {
      toast.error('Failed to start chat');
    }
  };

  const cancelRequest = async () => {
    setCancelLoading(true);
    try {
      await requestApi.cancel(selected.id);
      toast.success('Request cancelled');
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePostRecyclingChoice = async (choice) => {
    try {
      const res = await requestApi.postRecyclingChoice(selected.id, {
        choice,
        returnAddress: choice === 'return' ? returnAddress : undefined
      });
      setRequests(requests.map(r => r.id === selected.id ? res.data : r));
      setSelected(res.data);
      toast.success('Choice saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      await reviewApi.create({
        vendorId: selected.vendorId,
        requestId: selected.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setReviewedRequestIds(prev => new Set([...prev, selected.id]));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
      throw err;
    }
  };

  const isRequestReviewable = (request) => {
    return ['completed', 'product_sold', 'product_returned'].includes(request.status) && !reviewedRequestIds.has(request.id);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid gap-4">
        {requests.map((req) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelected(req)}
            className="glass-card p-5 hover:border-white/20 cursor-pointer transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-semibold text-sm">{req.category} • {req.quantity}</h3>
                  <StatusBadge status={req.status} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-text-light">
                  {req.vendor?.name && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" /> {req.vendor.name}
                    </span>
                  )}
                  {req.rider?.name && (
                    <span className="flex items-center gap-1 text-eco-green">
                      <User className="w-3 h-3" /> Rider: {req.rider.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-eco-green font-bold">Details</span>
                <ArrowRight className="w-4 h-4 text-eco-green" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="glass-card p-12 text-center">
          <p className="text-text-light">No requests yet.</p>
        </div>
      )}

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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selected.category} Request</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <XCircle className="w-5 h-5 text-text-light" />
                </button>
              </div>

              {selected.image && (
                <img
                  src={selected.image}
                  alt=""
                  className="w-full h-48 object-cover rounded-xl mb-4 border border-white/10"
                />
              )}

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-text-light text-sm font-medium">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                <StatusTimeline 
                  status={selected.status} 
                  timestamps={{
                    riderAssignedAt: selected.riderAssignedAt,
                    riderOnPickupAt: selected.riderOnPickupAt,
                    riderPickedUpAt: selected.riderPickedUpAt,
                    wasteReceivedAt: selected.wasteReceivedAt,
                    returnRiderAssignedAt: selected.returnRiderAssignedAt,
                    returnOnWayAt: selected.returnOnWayAt,
                    productReturnedAt: selected.productReturnedAt
                  }} 
                />
                
                <div className="glass-card p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-light text-xs">Quantity</span>
                    <span className="text-white text-sm">{selected.quantity}</span>
                  </div>
                  <div>
                    <span className="text-text-light text-xs block mb-1">Address</span>
                    <span className="text-text-light text-sm">{selected.address}</span>
                  </div>
                  {selected.notes && (
                    <div>
                      <span className="text-text-light text-xs block mb-1">Notes</span>
                      <span className="text-text-light text-sm">{selected.notes}</span>
                    </div>
                  )}
                </div>

                {selected.vendor?.name && (
                  <div className="glass-card p-4">
                    <p className="text-text-light text-xs mb-1">Vendor</p>
                    <p className="text-white text-sm">{selected.vendor.name}</p>
                  </div>
                )}
                {selected.rider?.name && (
                  <div className="glass-card p-4">
                    <p className="text-text-light text-xs mb-1">Assigned Rider</p>
                    <p className="text-white text-sm">{selected.rider.name}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button 
                  onClick={startChat}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat with Vendor
                </button>

                {isRequestReviewable(selected) && (
                  <button
                    onClick={() => {
                      setCurrentReviewRequestId(selected.id);
                      setShowReviewModal(true);
                    }}
                    className="btn-primary w-full flex items-center justify-center gap-2 bg-eco-green hover:bg-eco-green/90"
                  >
                    <Star className="w-4 h-4" />
                    Write Review
                  </button>
                )}

                {selected.recyclingStartedAt && (
                  <div className="glass-card p-3">
                    <p className="text-text-light text-xs">
                      <strong>Recycling Started:</strong> {new Date(selected.recyclingStartedAt).toLocaleString()}
                      {selected.estimatedCompletionDays && (
                        <>
                          <br /><strong>Est. Completion:</strong> {selected.estimatedCompletionDays} days
                        </>
                      )}
                    </p>
                  </div>
                )}

                {selected.recyclingCompletedAt && (
                  <div className="bg-eco-green/10 border border-eco-green/30 p-3 rounded-xl">
                    <p className="text-eco-green text-xs">
                      <strong>Recycling Complete!</strong> {new Date(selected.recyclingCompletedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {selected.status === 'recycling_completed' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-light mb-1 block">Return Address</label>
                      <input
                        type="text"
                        value={returnAddress}
                        onChange={(e) => setReturnAddress(e.target.value)}
                        placeholder="Enter your address for product return"
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePostRecyclingChoice('return')}
                        className="btn-primary flex-1"
                        disabled={!returnAddress}
                      >
                        Get Product Back
                      </button>
                      <button
                        onClick={() => handlePostRecyclingChoice('sell')}
                        className="btn-secondary flex-1"
                      >
                        Sell Product
                      </button>
                    </div>
                  </div>
                )}

                {['pending', 'vendor_accepted'].includes(selected.status) && (
                  <button
                    onClick={cancelRequest}
                    disabled={cancelLoading}
                    className="btn-secondary w-full text-red-400 flex items-center justify-center gap-2"
                  >
                    {cancelLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {cancelLoading ? 'Cancelling...' : 'Cancel Request'}
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
        vendorName={selected?.vendor?.name || 'Vendor'}
        onSubmit={handleSubmitReview}
      />
    </motion.div>
  );
}
