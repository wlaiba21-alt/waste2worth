import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { orderApi } from '../../api';
import { toast } from 'sonner';

export function VendorEarnings() {
  const [data, setData] = useState({ total: 0, transactions: [] });
  const [orders, setOrders] = useState([]);

  const load = () => {
    orderApi.earnings().then(({ data }) => setData(data));
    orderApi.sales().then(({ data }) => setOrders(data));
  };

  useEffect(() => { load(); }, []);

  const confirmCod = async (id) => {
    try {
      await orderApi.confirmCod(id);
      toast.success('COD payment confirmed — commissions distributed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 border-eco-green/20">
        <p className="text-text-light text-sm">Total Earnings</p>
        <p className="text-4xl font-bold text-eco-green">${data.total?.toFixed(2)}</p>
        <p className="text-xs text-text-light mt-2">Commission: 60% vendor / 25% waste owner / 15% platform</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10"><h2 className="text-lg font-semibold text-white">Store Orders</h2></div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-sm text-text-light bg-white/5">
              <th className="p-4">Order</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5">
                <td className="p-4 text-white">#{o.id.slice(-6)}</td>
                <td className="p-4">${o.amount?.toFixed(2)}</td>
                <td className="p-4 uppercase text-sm">{o.paymentMethod}</td>
                <td className="p-4 text-sm">{o.paymentStatus}</td>
                <td className="p-4">
                  {o.paymentMethod === 'cod' && o.paymentStatus === 'pending' && (
                    <button onClick={() => confirmCod(o.id)} className="btn-primary py-1 px-3 text-xs">Confirm COD</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
