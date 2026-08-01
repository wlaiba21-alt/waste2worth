import React, { useEffect, useState } from 'react';
import { adminApi, orderApi } from '../../api';

export function AdminEarnings() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    adminApi.stats().then(({ data }) => setStats(data));
    orderApi.all().then(({ data }) => setOrders(data.filter((o) => o.paymentStatus === 'paid')));
  }, []);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthRevenue = orders
    .filter((o) => new Date(o.createdAt) >= monthStart)
    .reduce((s, o) => s + (o.commission?.admin || 0), 0);

  if (!stats) return <div className="text-text-light">Loading earnings...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-eco-green/30">
          <p className="text-sm text-text-light mb-1">Total Platform Revenue (admin fee)</p>
          <h3 className="text-4xl font-bold text-white mb-2">${(stats.platformRevenue || 0).toFixed(2)}</h3>
          <p className="text-xs text-eco-green">All paid store orders</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-text-light mb-1">Revenue This Month</p>
          <h3 className="text-4xl font-bold text-white mb-2">${monthRevenue.toFixed(2)}</h3>
          <p className="text-xs text-text-light">{orders.length} paid orders total</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Commission Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-sm text-text-light bg-white/5">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Gross Amount</th>
                <th className="p-4 font-medium">Vendor (60%)</th>
                <th className="p-4 font-medium">User (25%)</th>
                <th className="p-4 font-medium text-eco-green">Platform (15%)</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-light">
                    No paid orders yet
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-text-light">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-white">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="p-4 text-sm text-text-light">${order.amount?.toFixed(2)}</td>
                    <td className="p-4 text-sm text-text-light">${(order.commission?.vendor || 0).toFixed(2)}</td>
                    <td className="p-4 text-sm text-text-light">${(order.commission?.user || 0).toFixed(2)}</td>
                    <td className="p-4 text-sm text-eco-green font-bold">+${(order.commission?.admin || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
