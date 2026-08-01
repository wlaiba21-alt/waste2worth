import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../api';
import { toast } from 'sonner';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  const load = () => adminApi.users().then(({ data }) => setUsers(data));
  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const toggleStatus = async (id, status) => {
    await adminApi.updateUserStatus(id, status);
    toast.success(`User ${status}`);
    load();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="glass-input max-w-xs" />
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-sm text-text-light bg-white/5">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Earned</th>
              <th className="p-4">Wallet</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="p-4 text-white">{u.name}</td>
                <td className="p-4 text-text-light">{u.email}</td>
                <td className="p-4 text-eco-green">${u.totalEarned?.toFixed(2)}</td>
                <td className="p-4">${u.walletBalance?.toFixed(2)}</td>
                <td className="p-4 capitalize">{u.status}</td>
                <td className="p-4">
                  <button onClick={() => toggleStatus(u.id, u.status === 'active' ? 'suspended' : 'active')} className="text-xs btn-secondary py-1 px-2">
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
