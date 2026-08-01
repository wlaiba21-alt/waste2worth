import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, Truck, CheckCircle2, Clock, XCircle, DollarSign } from 'lucide-react';
import { adminApi } from '../../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22C55E', '#3B82F6', '#F97316', '#FACC15'];

export function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    adminApi.stats().then(({ data }) => setStats(data));
    adminApi.analytics().then(({ data }) => setCharts(data));
  }, []);

  if (!stats) return <div className="text-text-light">Loading...</div>;

  const cards = [
    { label: 'Users', value: stats.users, icon: Users },
    { label: 'Vendors', value: stats.vendors, icon: Briefcase },
    { label: 'Riders', value: stats.riders, icon: Truck },
    { label: 'Requests', value: stats.requests, icon: CheckCircle2 },
    { label: 'Completed', value: stats.completedRequests, icon: CheckCircle2, color: '#22C55E' },
    { label: 'Pending', value: stats.pendingRequests, icon: Clock, color: '#FACC15' },
    { label: 'Rejected', value: stats.rejectedRequests, icon: XCircle, color: '#EF4444' },
    { label: 'Platform Revenue', value: `$${stats.platformRevenue?.toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass-card p-6">
            <c.icon className="w-6 h-6 mb-3" style={{ color: c.color || '#22C55E' }} />
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-sm text-text-light">{c.label}</p>
          </motion.div>
        ))}
      </div>
      {charts && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 h-80">
            <h3 className="text-white font-semibold mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={charts.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="users" stroke="#22C55E" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-6 h-80">
            <h3 className="text-white font-semibold mb-4">Waste by Category</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={charts.wasteByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {charts.wasteByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
