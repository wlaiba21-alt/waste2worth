import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addressApi } from '../../api';

export function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ label: 'Home', street: '', city: '', state: '', zip: '', isDefault: false });
  const [showForm, setShowForm] = useState(false);

  const load = () => addressApi.list().then(({ data }) => setAddresses(data));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addressApi.create(form);
      toast.success('Address added');
      setShowForm(false);
      setForm({ label: 'Home', street: '', city: '', state: '', zip: '', isDefault: false });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (id) => {
    await addressApi.remove(id);
    toast.success('Deleted');
    load();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Saved Addresses</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2 text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleSubmit} className="glass-card p-6 grid md:grid-cols-2 gap-4">
          <input className="glass-input" placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input required className="glass-input" placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <input required className="glass-input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className="glass-input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <input className="glass-input" placeholder="ZIP" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-text-light"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Default</label>
          <button type="submit" className="btn-primary md:col-span-2">Save Address</button>
        </motion.form>
      )}

      <div className="grid gap-4">
        {addresses.map((a, i) => (
          <motion.div key={a._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5 flex justify-between items-start">
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-eco-green mt-1" />
              <div>
                <p className="font-medium text-white">{a.label} {a.isDefault && <span className="text-xs text-eco-green">(Default)</span>}</p>
                <p className="text-sm text-text-light">{a.street}, {a.city}, {a.state} {a.zip}</p>
              </div>
            </div>
            <button onClick={() => remove(a._id)} className="p-2 text-text-light hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
