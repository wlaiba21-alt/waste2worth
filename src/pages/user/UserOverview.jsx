import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Recycle, ListOrdered, DollarSign, Leaf, ArrowRight, Store, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { requestApi, storeApi } from '../../api';

export function UserOverview() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [awaiting, setAwaiting] = useState(0);

  useEffect(() => {
    requestApi.my().then(({ data }) => setRequests(data.slice(0, 5)));
    storeApi.awaitingChoice().then(({ data }) => setAwaiting(data.length));
  }, []);

  const stats = [
    { label: 'Active Requests', value: requests.filter((r) => ['pending', 'accepted', 'in-progress'].includes(r.status)).length, icon: ListOrdered, color: 'text-sky-blue', bg: 'bg-sky-blue/10' },
    { label: 'Wallet Balance', value: `$${(currentUser?.walletBalance || 0).toFixed(2)}`, icon: DollarSign, color: 'text-yellow-accent', bg: 'bg-yellow-accent/10' },
    { label: 'Total Earned', value: `$${(currentUser?.totalEarned || 0).toFixed(2)}`, icon: Leaf, color: 'text-eco-green', bg: 'bg-eco-green/10' },
    { label: 'Products to Decide', value: awaiting, icon: Package, color: 'text-soft-orange', bg: 'bg-soft-orange/10' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Welcome back, {currentUser?.name?.split(' ')[0]}!</h1>
        <p className="text-text-light text-sm mt-1">Track recycling, store sales, and wallet rewards.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-6">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-4`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-text-light mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {awaiting > 0 && (
        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-4 border-soft-orange/30 flex items-center justify-between">
          <p className="text-white"><Package className="w-5 h-5 inline mr-2 text-soft-orange" />{awaiting} recycled product(s) need your decision</p>
          <Link to="/dashboard/product-choice" className="btn-primary py-2 text-sm">Choose Now</Link>
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/store" className="glass-card p-4 hover:border-eco-green/30 flex items-center gap-3"><Store className="w-8 h-8 text-eco-green" /><span className="text-white">Browse Store</span><ArrowRight className="w-4 h-4 ml-auto text-text-light" /></Link>
        <Link to="/dashboard/wallet" className="glass-card p-4 hover:border-eco-green/30 flex items-center gap-3"><DollarSign className="w-8 h-8 text-eco-green" /><span className="text-white">Wallet</span><ArrowRight className="w-4 h-4 ml-auto text-text-light" /></Link>
        <Link to="/vendors" className="glass-card p-4 hover:border-eco-green/30 flex items-center gap-3"><Recycle className="w-8 h-8 text-eco-green" /><span className="text-white">Find Vendors</span><ArrowRight className="w-4 h-4 ml-auto text-text-light" /></Link>
      </div>
    </motion.div>
  );
}
