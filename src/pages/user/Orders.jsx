import React, { useEffect, useState } from 'react';
import { orderApi } from '../../api';
import { Receipt, Download } from 'lucide-react';

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .sales()
      .then(({ data }) => setOrders(data.filter((o) => o.paymentStatus === 'paid')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-light">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">My Orders & Payouts</h2>
          <p className="text-sm text-text-light mt-1">Store sales where you earned the waste-owner share.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-sm text-text-light bg-white/5">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Vendor</th>
                <th className="p-4 font-medium">Gross Amount</th>
                <th className="p-4 font-medium">Your Reward</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Receipt className="w-12 h-12 text-text-light/50 mx-auto mb-3" />
                    <p className="text-text-light">No completed payouts yet.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-white font-medium">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="p-4 text-sm text-text-light">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-text-light">{order.product?.title || '—'}</td>
                    <td className="p-4 text-sm text-text-light">{order.vendor?.name || '—'}</td>
                    <td className="p-4 text-sm text-text-light">${order.amount?.toFixed(2)}</td>
                    <td className="p-4 text-sm text-eco-green font-bold">${(order.commission?.user || 0).toFixed(2)}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium bg-eco-green/20 text-eco-green">
                        {order.paymentStatus}
                      </span>
                    </td>
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
