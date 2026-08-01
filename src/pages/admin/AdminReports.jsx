import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Trash2,
  ShoppingCart,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from 'sonner';

export function AdminReports() {
  const [stats, setStats] = useState({
    users: 0,
    requests: 0,
    orders: 0,
    platformRevenue: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    completedRequests: 0,
    rejectedRequests: 0
  });
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showToast = false) => {
    try {
      setLoading(!showToast);
      setRefreshing(showToast);

      const [statsRes, requestsRes, ordersRes] = await Promise.all([
        adminApi.stats(),
        adminApi.requests(),
        adminApi.orders()
      ]);

      setStats({
        users: statsRes?.data?.users ?? 0,
        requests: statsRes?.data?.requests ?? 0,
        orders: statsRes?.data?.orders ?? 0,
        platformRevenue: statsRes?.data?.platformRevenue ?? 0,
        pendingRequests: statsRes?.data?.pendingRequests ?? 0,
        acceptedRequests: statsRes?.data?.acceptedRequests ?? 0,
        completedRequests: statsRes?.data?.completedRequests ?? 0,
        rejectedRequests: statsRes?.data?.rejectedRequests ?? 0
      });
      setRequests(Array.isArray(requestsRes?.data) ? requestsRes.data : []);
      setOrders(Array.isArray(ordersRes?.data) ? ordersRes.data : []);

      if (showToast) {
        toast.success('Reports refreshed successfully');
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-eco-green animate-spin" />
        <p className="text-text-light">Loading reports...</p>
      </div>
    );
  }

  // Calculate category breakdown (safely)
  const categoryBreakdown = requests.reduce((acc, r) => {
    const category = r?.category || 'Other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  // Combine and sort recent transactions (safely)
  const recentTransactions = [
    ...(requests || []).map(r => ({
      id: r?.id || r?._id || `request-${Math.random()}`,
      type: 'Recycling',
      date: r?.createdAt || new Date().toISOString(),
      user: r?.user?.name || 'Unknown',
      status: r?.status || 'unknown',
      amount: r?.estimatedReward || 0
    })),
    ...(orders || []).filter(o => o?.paymentStatus === 'paid').map(o => ({
      id: o?.id || o?._id || `order-${Math.random()}`,
      type: 'Store Order',
      date: o?.createdAt || new Date().toISOString(),
      user: o?.buyer?.name || 'Unknown',
      status: o?.orderStatus || o?.status || 'unknown',
      amount: o?.amount || 0
    }))
  ].sort((a, b) => {
    try {
      return new Date(b.date) - new Date(a.date);
    } catch {
      return 0;
    }
  }).slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-eco-green" />
          Platform Reports & Analytics
        </h2>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-xs text-text-light mb-1">Total Users</p>
          <p className="text-2xl font-bold text-white">{stats.users}</p>
        </div>

        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <Trash2 className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-xs text-text-light mb-1">Total Recycling Requests</p>
          <p className="text-2xl font-bold text-white">{stats.requests}</p>
        </div>

        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <ShoppingCart className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-xs text-text-light mb-1">Total Store Orders</p>
          <p className="text-2xl font-bold text-white">{stats.orders}</p>
        </div>

        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-xs text-text-light mb-1">Total Platform Revenue</p>
          <p className="text-2xl font-bold text-white">${(stats.platformRevenue || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Request Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            Recycling Request Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-sm text-text-light">Pending</span>
              <span className="text-xl font-bold text-yellow-400">{stats.pendingRequests}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-sm text-text-light">Accepted</span>
              <span className="text-xl font-bold text-blue-400">{stats.acceptedRequests}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-sm text-text-light">Completed</span>
              <span className="text-xl font-bold text-green-400">{stats.completedRequests}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-sm text-text-light">Rejected</span>
              <span className="text-xl font-bold text-red-400">{stats.rejectedRequests}</span>
            </div>
          </div>
        </div>

        {/* Request Category Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-orange-400" />
            Waste Category Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown).length === 0 ? (
              <p className="text-text-light text-center p-4">No data available</p>
            ) : (
              Object.entries(categoryBreakdown).map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
                >
                  <span className="text-sm text-text-light capitalize">{category}</span>
                  <span className="text-xl font-bold text-white">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Orders & Requests</h3>
        </div>
        <div className="overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-text-light">No recent transactions</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr className="text-xs text-text-light">
                  <th className="p-4">Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(item => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.type === 'Recycling'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-light">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-white">{item.user}</td>
                    <td className="p-4 text-sm text-text-light capitalize">
                      {item.status.replace(/_/g, ' ')}
                    </td>
                    <td className="p-4 text-sm text-right text-white font-medium">
                      ${(item.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
