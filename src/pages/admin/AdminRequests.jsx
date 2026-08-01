import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { requestApi, adminApi } from '../../api';
import { toast } from 'sonner';
import { getSocket } from '../../lib/socket';

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

export function AdminRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    adminApi.requests().then(({ data }) => setRequests(data));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleRequestUpdate = (data) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === data.requestId ? { ...r, status: data.status, riderId: data.riderId } : r))
      );
    };
    socket.on('request_status_changed', handleRequestUpdate);
    return () => socket.off('request_status_changed', handleRequestUpdate);
  }, []);

  const handleAdminAction = async (id, action) => {
    try {
      const res = await requestApi.adminAction(id, action);
      setRequests(requests.map(r => r.id === id ? res.data : r));
      toast.success(`Request ${action}ed!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update request');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-sm text-text-light bg-white/5">
              <th className="p-4">User</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Rider</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="p-4 text-white">{r.user?.name || r.userId}</td>
                <td className="p-4 text-text-light">{r.vendor?.name || r.vendorId}</td>
                <td className="p-4">{r.rider?.name || '-'}</td>
                <td className="p-4">{r.category}</td>
                <td className={`p-4 capitalize ${getStatusColor(r.status)}`}>
                  {r.status.replace(/_/g, ' ')}
                </td>
                <td className="p-4">
                  {r.status === 'vendor_accepted' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdminAction(r.id, 'approve')}
                        className="btn-primary text-xs py-1 px-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAdminAction(r.id, 'reject')}
                        className="btn-secondary text-xs py-1 px-2"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
