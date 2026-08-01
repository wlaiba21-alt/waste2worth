import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package } from 'lucide-react';
import { toast } from 'sonner';
import { storeApi } from '../../api';

export function CreateProductModal({ request, onClose, onCreated }) {
  const [title, setTitle] = useState(`${request?.category || ''} Recycled Product`);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('45');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    if (image) formData.append('images', image);
    else if (request?.image) formData.append('imageUrl', request.image);

    setLoading(true);
    try {
      await storeApi.createFromRequest(request.id, formData);
      toast.success('Recycled product created! User will choose take-back or store listing.');
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-md p-6">
          <motion.div initial={{ y: -8 }} animate={{ y: 0 }} className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-eco-green" /> Add Recycled Product
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="glass-input w-full" placeholder="Product title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className="glass-input w-full min-h-[80px]" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input type="number" min="1" className="glass-input w-full" placeholder="Price ($)" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0])} className="text-sm text-text-light" />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating...' : 'Create Product for User'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
