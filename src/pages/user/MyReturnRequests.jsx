import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  User,
  Building,
  ArrowRight,
  Package
} from 'lucide-react';
import { requestApi } from '../../api';
import { getSocket } from '../../lib/socket';

const RETURN_TIMELINE = [
  { key: 'return_requested', label: 'Return Requested', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', description: 'You requested product return' },
  { key: 'return_approved', label: 'Return Approved', icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', description: 'Vendor approved return' },
  { key: 'return_rider_assigned', label: 'Rider Assigned', icon: Truck, color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20', description: 'Rider assigned for return' },
  { key: 'return_on_way', label: 'On the Way', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', description: 'Rider is delivering product' },
  { key: 'product_returned', label: 'Return Completed', icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10 border-eco-green/20', description: 'Product returned successfully' },
];

function getStatusInfo(status) {
  const allStatuses = [...RETURN_TIMELINE, 
    { key: 'return_rejected', label: 'Return Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', description: 'Return request was rejected' }
  ];
  return allStatuses.find(s => s.key === status) || { key: status, label: status, icon: XCircle, color: 'text-text-light', bg: 'bg-white/10 border-white/10', description: status };
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
  const isRejected = status === 'return_rejected';
  if (isRejected) {
    const info = getStatusInfo(status);
    const Icon = info.icon;
    return (
      <div className="flex items-center gap-2 text-xs mt-2">
        <Icon className="w-4 h-4" /> {info.description}
      </div>
    );
  }
  
  const currentIndex = RETURN_TIMELINE.findIndex((step) => step.key === status);

  return (
    <div className="mt-3 space-y-2">
      {RETURN_TIMELINE.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const Icon = step.icon;
        const timestampKey = {
          'return_rider_assigned': 'returnRiderAssignedAt',
          'return_on_way': 'returnOnWayAt',
          'product_returned': 'productReturnedAt'
        }[step.key];
        const timestamp = timestamps && timestampKey ? timestamps[timestampKey] : null;
        
        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                done
                  ? 'bg-eco-green border-eco-green text-white'
                  : active
                    ? 'bg-white/10 border-eco-green text-eco-green'
                    : 'bg-white/5 border-white/10 text-text-light/40'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              {i < RETURN_TIMELINE.length - 1 && (
                <div className={`w-0.5 h-6 my-1 ${done ? 'bg-eco-green/40' : 'bg-white/10'}`} />
              )}
            </div>
            <div className="pt-1.5">
              <p className={`text-xs font-semibold ${
                done ? 'text-eco-green' : active ? 'text-white' : 'text-text-light/40'
              }`}>
                {step.label}
              </p>
              <p className={`text-[10px] ${
                done ? 'text-eco-green/60' : active ? 'text-text-light' : 'text-text-light/20'
              }`}>
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

export function MyReturnRequests() {
  const [returnRequests, setReturnRequests] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const { data } = await requestApi.my();
    const filtered = data.filter(req => 
      ['return_requested', 'return_approved', 'return_rejected', 'return_rider_assigned', 'return_on_way', 'product_returned'].includes(req.status)
    );
    setReturnRequests(filtered);
  };

  useEffect(() => {
    load();
  }, []);

  // Real-time socket updates for request status changes
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = (data) => {
      setReturnRequests((prev) =>
        prev.map((r) => r.id === data.requestId ? { ...r, status: data.status } : r)
      );
      setSelected((prev) =>
        prev?.id === data.requestId ? { ...prev, status: data.status } : prev
      );
    };
    socket.on('request_status_changed', handleUpdate);
    return () => socket.off('request_status_changed', handleUpdate);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">My Return Requests</h1>
      </motion.div>

      <div className="grid gap-4">
        {returnRequests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setSelected(req)}
            className="glass-card p-5 hover:border-white/20 cursor-pointer transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-semibold text-sm">{req.category} • Product Return</h3>
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
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" /> Requested: {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-col md:flex-row">
                {req.finalReward > 0 && (
                  <span className="text-eco-green font-bold">+${req.finalReward.toFixed(2)}</span>
                )}
                <span className="text-eco-green font-bold">Details</span>
                <ArrowRight className="w-4 h-4 text-eco-green" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {returnRequests.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Package className="w-12 h-12 text-text-light/40 mx-auto mb-4" />
          <p className="text-text-light">No return requests yet.</p>
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
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Return Details</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-text-light"
                >
                  <XCircle className="w-6 h-6" />
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
                <div className="flex justify-between">
                  <span className="text-text-light text-sm font-medium">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                <StatusTimeline 
                  status={selected.status} 
                  timestamps={{
                    returnRiderAssignedAt: selected.returnRiderAssignedAt,
                    returnOnWayAt: selected.returnOnWayAt,
                    productReturnedAt: selected.productReturnedAt
                  }} 
                />
                
                <div className="glass-card p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-light text-xs">Category</span>
                    <span className="text-white text-sm">{selected.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-light text-xs">Quantity</span>
                    <span className="text-white text-sm">{selected.quantity}</span>
                  </div>
                  {selected.returnAddress && (
                    <div>
                      <span className="text-text-light text-xs block mb-1">Return Address</span>
                      <span className="text-text-light text-sm">{selected.returnAddress}</span>
                    </div>
                  )}
                  {selected.returnRejectionReason && (
                    <div>
                      <span className="text-text-light text-xs block mb-1">Rejection Reason</span>
                      <span className="text-red-400 text-sm">{selected.returnRejectionReason}</span>
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
                {selected.finalReward > 0 && (
                  <div className="glass-card p-4">
                    <p className="text-text-light text-xs mb-1">Reward</p>
                    <p className="text-eco-green font-bold text-lg">+${selected.finalReward.toFixed(2)}</p>
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