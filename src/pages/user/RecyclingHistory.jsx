import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { requestApi } from '../../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-400';
    case 'vendor_accepted':
      return 'text-blue-400';
    case 'admin_approved':
    case 'rider_assigned':
    case 'rider_on_pickup':
    case 'rider_picked_up':
    case 'waste_received':
    case 'recycling_started':
    case 'recycling_completed':
    case 'return_requested':
    case 'return_rider_assigned':
    case 'return_on_way':
    case 'product_returned':
    case 'product_sold':
      return 'text-eco-green';
    case 'vendor_rejected':
    case 'admin_rejected':
    case 'cancelled':
      return 'text-red-400';
    default:
      return 'text-text-light';
  }
};

const getStatusLabel = (status) => {
  return status.replace(/_/g, ' ');
};

export function RecyclingHistory() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await requestApi.my();
      setRequests(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load recycling history');
      toast.error('Failed to load recycling history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="flex items-center justify-center min-h-[400px]"
      >
        <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="glass-card p-8 text-center"
      >
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
        <p className="text-text-light mb-4">{error}</p>
        <button 
          onClick={loadRequests}
          className="btn-primary"
        >
          Try again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Recycling History</h1>
        <span className="text-text-light text-sm">{requests.length} items</span>
      </div>

      {requests.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-white/20 text-6xl mb-4">♻️</div>
          <h3 className="text-lg font-semibold text-white mb-2">No recycling history yet</h3>
          <p className="text-text-light">Start your first recycling request to see your history here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  {req.image ? (
                    <img 
                      src={req.image} 
                      alt={req.category} 
                      className="w-20 h-20 object-cover rounded-lg border border-white/10"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-white/50 text-2xl">
                      ♻️
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-white">
                      {req.category} • {req.quantity}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-text-light">
                        {new Date(req.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      {req.vendor?.name && (
                        <span className="text-text-light">
                          Vendor: {req.vendor.name}
                        </span>
                      )}
                      {req.postRecyclingChoice && (
                        <span className="px-2 py-0.5 rounded-full bg-eco-green/10 text-eco-green text-xs font-medium">
                          {req.postRecyclingChoice === 'sell' ? 'Sell on Store' : 'Get Product Back'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-sm font-medium capitalize ${getStatusColor(req.status)}`}>
                    {getStatusLabel(req.status)}
                  </span>
                  {req.finalReward > 0 && (
                    <span className="text-eco-green font-bold text-lg">
                      +${req.finalReward.toFixed(2)}
                    </span>
                  )}
                  {!req.finalReward && req.estimatedReward > 0 && (
                    <span className="text-text-light font-medium">
                      Est. ${req.estimatedReward.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
