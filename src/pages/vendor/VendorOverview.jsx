import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListOrdered, CheckCircle2, DollarSign, Star, TrendingUp } from 'lucide-react';
import { requestApi, orderApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function VendorOverview() {
  const { vendorProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([requestApi.incoming(), orderApi.earnings()])
      .then(([reqRes, earnRes]) => {
        setRequests(reqRes.data);
        setEarnings(earnRes.data);
      })
      .catch((err) => {
        console.error('Error loading vendor dashboard:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-accent/20 text-yellow-accent';
      case 'accepted':
        return 'bg-sky-blue/20 text-sky-blue';
      case 'in-progress':
        return 'bg-soft-orange/20 text-soft-orange';
      case 'completed':
        return 'bg-eco-green/20 text-eco-green';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-white/10 text-text-light';
    }
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const completedMonth = requests.filter(
    (r) => r.status === 'completed' && new Date(r.createdAt) >= monthStart
  ).length;

  const monthlyMap = {};
  earnings.transactions?.forEach((t) => {
    const m = new Date(t.date).toLocaleString('en', { month: 'short' });
    monthlyMap[m] = (monthlyMap[m] || 0) + (t.earned || 0);
  });
  const chartData =
    Object.keys(monthlyMap).length > 0
      ? Object.entries(monthlyMap).map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
      : [{ name: now.toLocaleString('en', { month: 'short' }), revenue: 0 }];

  const recentRequests = requests.slice(0, 5);

  const kpis = [
    { label: 'Pending Requests', value: String(pendingCount), icon: ListOrdered, color: 'text-yellow-accent', bg: 'bg-yellow-accent/10' },
    { label: 'Completed (Month)', value: String(completedMonth), icon: CheckCircle2, color: 'text-eco-green', bg: 'bg-eco-green/10' },
    { label: 'Total Earnings', value: `$${(earnings.total || 0).toFixed(2)}`, icon: DollarSign, color: 'text-sky-blue', bg: 'bg-sky-blue/10' },
    { label: 'Avg Rating', value: String(vendorProfile?.rating ?? '—'), icon: Star, color: 'text-soft-orange', bg: 'bg-soft-orange/10' },
  ];

  if (loading) return <div className="text-text-light">Loading overview...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-sm text-text-light">{kpi.label}</p>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Earnings Overview</h2>
            <div className="flex items-center gap-2 text-sm text-eco-green bg-eco-green/10 px-3 py-1 rounded-full">
              <TrendingUp className="w-4 h-4" /> Live from store orders
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#CBD5E1" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#CBD5E1" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#22C55E' }} />
                <Line type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={3} dot={{ r: 4, fill: '#22C55E' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card flex flex-col">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Requests</h2>
            <Link to="/vendor/dashboard/requests" className="text-sm text-eco-green hover:underline">
              View All
            </Link>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-4">
              {recentRequests.length === 0 ? (
                <p className="text-center text-text-light py-8">No requests found.</p>
              ) : (
                recentRequests.map((req) => (
                  <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium mb-2 inline-block ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                        <h3 className="text-sm font-medium text-white">
                          {req.category} • {req.quantity}
                        </h3>
                        <p className="text-xs text-text-light mt-1">{req.user?.name || 'User'}</p>
                      </div>
                      <span className="text-xs text-text-light">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    {req.status === 'pending' && (
                      <Link to="/vendor/dashboard/requests" className="text-xs text-eco-green hover:underline mt-2 inline-block">
                        Respond in Incoming Requests →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
