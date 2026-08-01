import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from 'sonner';
import { getSocket } from '../../lib/socket';

export function AdminRiders() {
  const [riders, setRiders] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // rider to delete
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  const load = () => adminApi.riders().then(({ data }) => setRiders(data));
  
  useEffect(() => { 
    load(); 
  }, []);

  useEffect(() => {
    const socket = getSocket();
    
    const handleStatusChange = (data) => {
      setRiders((prevRiders) =>
        prevRiders.map((r) =>
          r.id === data.riderId
            ? { ...r, availabilityStatus: data.availabilityStatus, displayStatus: data.displayStatus }
            : r
        )
      );
    };

    const handleProfileUpdate = (data) => {
      setRiders((prevRiders) =>
        prevRiders.map((r) =>
          r.id === data.id
            ? { ...r, ...data }
            : r
        )
      );
    };

    socket.on('rider_status_changed', handleStatusChange);
    socket.on('rider_profile_updated', handleProfileUpdate);

    return () => {
      socket.off('rider_status_changed', handleStatusChange);
      socket.off('rider_profile_updated', handleProfileUpdate);
    };
  }, []);

  const filtered = riders.filter((r) => (r.userId?.name || '').toLowerCase().includes(search.toLowerCase()) || (r.userId?.email || '').toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createRider(form);
      toast.success('Rider created successfully!');
      setForm({ name: '', email: '', phone: '', password: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create rider');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteRider(deleteTarget._id);
      toast.success(`Rider "${deleteTarget.userId?.name}" deleted successfully`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete rider');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'busy': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'inactive': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search riders..."
          className="glass-input max-w-xs"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Rider
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Rider</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="glass-input"
            />
            <input
              required
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="glass-input"
            />
            <input
              required
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="glass-input"
            />
            <input
              required
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="glass-input"
            />
            <div />
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary flex-1">Add Rider</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-sm text-text-light bg-white/5">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Availability</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="p-4 text-white font-medium">{r.userId?.name || 'N/A'}</td>
                <td className="p-4 text-text-light">{r.userId?.email || 'N/A'}</td>
                <td className="p-4 text-text-light">{r.phone || 'N/A'}</td>
                <td className="p-4">
                  <span className={`capitalize text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusColor(r.availabilityStatus)}`}>
                    {r.availabilityStatus || 'unknown'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-light text-sm">No riders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-sm mx-4"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Delete Rider</h3>
                </div>
                <button
                  onClick={() => !deleting && setDeleteTarget(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-text-light transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-text-light text-sm mb-1">
                Are you sure you want to delete rider:
              </p>
              <p className="text-white font-semibold mb-1">{deleteTarget.userId?.name}</p>
              <p className="text-text-light text-xs mb-6">{deleteTarget.userId?.email}</p>

              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-6">
                <p className="text-red-400 text-xs">
                  ⚠️ This will permanently delete the rider's account and profile. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => !deleting && setDeleteTarget(null)}
                  disabled={deleting}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 text-red-400 font-medium py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
