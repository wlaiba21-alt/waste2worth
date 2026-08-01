import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { vendorApi } from '../../api';

export function AddPortfolioModal({ onClose, onCreated }) {
  const [description, setDescription] = useState('');
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!before || !after) {
      toast.error('Please upload both before and after images');
      return;
    }

    const formData = new FormData();
    formData.append('description', description);
    formData.append('before', before);
    formData.append('after', after);

    setLoading(true);
    try {
      const { data } = await vendorApi.addPortfolio(formData);
      toast.success('Project added to portfolio');
      onCreated?.(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-eco-green" /> Add Project
            </h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              className="glass-input w-full min-h-[80px]"
              placeholder="Describe the transformation (e.g. PET bottles to eco-bricks)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm text-text-light mb-1">Before image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBefore(e.target.files?.[0] || null)}
                className="text-sm text-text-light w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-light mb-1">After image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAfter(e.target.files?.[0] || null)}
                className="text-sm text-text-light w-full"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Adding...' : 'Add Project'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
