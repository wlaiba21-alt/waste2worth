import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Home, Store, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/UserAvatar';
import { authApi, storeApi, requestApi } from '../../api';

// Helper functions for recycling requests
const getRequestStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-400';
    case 'vendor_accepted':
      return 'text-blue-400';
    case 'admin_approved':
    case 'rider_assigned':
    case 'rider_on_pickup':
    case 'rider_picked_up':
    case 'waste_received':
    case 'recycling_started':
    case 'recycling_completed':
    case 'return_requested':
    case 'return_rider_assigned':
    case 'return_on_way':
    case 'product_returned':
    case 'product_sold':
      return 'text-eco-green';
    case 'vendor_rejected':
    case 'admin_rejected':
    case 'cancelled':
      return 'text-red-400';
    default:
      return 'text-text-light';
  }
};

const getRequestStatusLabel = (status) => {
  return status.replace(/_/g, ' ');
};

export function UserProfile() {
  const { currentUser, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ name: currentUser?.name || '', phone: currentUser?.phone || '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [returnAddress, setReturnAddress] = useState('');
  const [choiceLoading, setChoiceLoading] = useState(null);
  const [recyclingHistory, setRecyclingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [walletBalance, setWalletBalance] = useState(currentUser?.walletBalance || 0);

  // Load both products and recycling history
  useEffect(() => {
    const loadData = async () => {
      setProductsLoading(true);
      setHistoryLoading(true);
      setHistoryError(null);
      
      try {
        const [productsRes, historyRes] = await Promise.all([
          storeApi.myProducts(),
          requestApi.my()
        ]);
        setProducts(productsRes.data);
        setRecyclingHistory(historyRes.data);
      } catch (err) {
        console.error('Failed to load data:', err);
        setHistoryError(err.response?.data?.message || 'Failed to load recycling history');
        toast.error('Failed to load some data');
      } finally {
        setProductsLoading(false);
        setHistoryLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload =
        avatarFile ?
          (() => {
            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('phone', form.phone);
            fd.append('avatar', avatarFile);
            return fd;
          })()
        : form;

      await authApi.updateProfile(payload);
      await refreshUser();
      setAvatarFile(null);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChoice = async (productId, choice) => {
    setChoiceLoading(productId);
    try {
      await storeApi.makeChoice(productId, {
        choice,
        returnAddress: choice === 'take_back' ? returnAddress : undefined
      });
      toast.success(choice === 'take_back' ? 'Return request submitted!' : 'Product listed for sale!');
      // Refresh products
      const { data } = await storeApi.myProducts();
      setProducts(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit choice');
    } finally {
      setChoiceLoading(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'awaiting_choice':
        return { label: 'Awaiting Your Choice', color: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' };
      case 'return_requested':
        return { label: 'Return Requested', color: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' };
      case 'listed':
        return { label: 'Listed for Sale', color: 'text-eco-green bg-eco-green/10 border border-eco-green/20' };
      case 'sold':
        return { label: 'Sold', color: 'text-purple-400 bg-purple-400/10 border border-purple-400/20' };
      default:
        return { label: status.replace('_', ' '), color: 'text-text-light bg-white/5 border border-white/10' };
    }
  };

  const displayAvatar = avatarPreview || currentUser?.avatar;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Profile Edit Section */}
      <motion.div className="glass-card p-8 max-w-lg">
        <div className="mb-6 flex flex-col sm:items-start">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={currentUser?.name || 'Profile'}
                className="h-24 w-24 rounded-full border-2 border-white/10 object-cover"
              />
            ) : (
              <UserAvatar
                src={currentUser?.avatar}
                name={currentUser?.name}
                className="h-24 w-24 rounded-full border-2 border-white/10 object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-eco-green text-white shadow-lg transition-colors hover:bg-eco-deep"
              aria-label="Change profile photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-sm font-medium text-eco-green hover:text-eco-light transition-colors"
          >
            Change profile photo
          </button>
          {avatarFile && <p className="mt-1 text-xs text-text-light">New photo selected — click Save Changes to apply</p>}
        </div>

        {/* Wallet Balance */}
        <div className="mb-6 p-4 rounded-lg bg-eco-green/10 border border-eco-green/20">
          <p className="text-sm text-text-light mb-1">Wallet Balance</p>
          <p className="text-2xl font-bold text-eco-green">${(currentUser?.walletBalance || 0).toFixed(2)}</p>
        </div>

        <form onSubmit={save} className="space-y-4">
          <input
            className="glass-input w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            required
          />
          <input
            className="glass-input w-full"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone"
          />
          <p className="text-sm text-text-light">Email: {currentUser?.email}</p>
          <p className="text-sm text-text-light capitalize">Role: {currentUser?.role}</p>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </motion.div>

      {/* Your Recycled Products Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Your Recycled Products</h2>
          <p className="text-text-light">Take it back or let others buy it from the store — you earn 25% on each sale.</p>
        </div>

        {productsLoading ? (
          <div className="glass-card p-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-text-light">No recycled products yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => {
              const statusDisplay = getStatusDisplay(product.status);
              return (
                <motion.div key={product.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <img
                      src={product.images?.[0] || 'https://coresg-normal.trae.ai/api/v1/text-to-image?prompt=recycled%20product%20placeholder&image_size=square'}
                      alt={product.title}
                      className="w-full md:w-48 h-48 object-cover rounded-lg"
                    />
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-1">{product.title}</h3>
                          <p className="text-text-light text-sm">{product.description}</p>
                        </div>
                        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusDisplay.color}`}>
                          {statusDisplay.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-6 text-sm text-text-light">
                        <div>
                          <span className="block text-xs font-medium text-white/70 mb-0.5">Recycling Date</span>
                          <span>{formatDate(product.recyclingDate)}</span>
                        </div>
                        {product.price && (
                          <div>
                            <span className="block text-xs font-medium text-white/70 mb-0.5">Price</span>
                            <span className="text-eco-green font-bold">${product.price.toFixed(2)}</span>
                          </div>
                        )}
                        {product.commissionPercentage && (
                          <div>
                            <span className="block text-xs font-medium text-white/70 mb-0.5">Your Commission</span>
                            <span className="text-eco-green font-semibold">{product.commissionPercentage}%</span>
                          </div>
                        )}
                      </div>

                      {product.status === 'awaiting_choice' && (
                        <div className="space-y-4 pt-2">
                          <div>
                            <label className="block text-xs font-medium text-text-light mb-2">Return Address (for take back option)</label>
                            <input
                              type="text"
                              value={returnAddress}
                              onChange={(e) => setReturnAddress(e.target.value)}
                              placeholder="Enter your address"
                              className="glass-input w-full max-w-md"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              disabled={choiceLoading === product.id}
                              onClick={() => handleChoice(product.id, 'take_back')}
                              className="btn-secondary flex-1 flex items-center justify-center gap-2"
                            >
                              {choiceLoading === product.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Home className="w-4 h-4" />
                              )}
                              Take My Product Back
                            </button>
                            <button
                              disabled={choiceLoading === product.id}
                              onClick={() => handleChoice(product.id, 'list_for_sale')}
                              className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                              {choiceLoading === product.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Store className="w-4 h-4" />
                              )}
                              Sell on Store
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Recycling History Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Recycling History</h2>
          <p className="text-text-light">View all your recycling requests and track their progress.</p>
        </div>

        {historyLoading ? (
          <div className="glass-card p-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
          </div>
        ) : historyError ? (
          <motion.div className="glass-card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
            <p className="text-text-light mb-4">{historyError}</p>
            <button 
              onClick={async () => {
                setHistoryLoading(true);
                setHistoryError(null);
                try {
                  const { data } = await requestApi.my();
                  setRecyclingHistory(data);
                } catch (err) {
                  setHistoryError(err.response?.data?.message || 'Failed to load recycling history');
                } finally {
                  setHistoryLoading(false);
                }
              }}
              className="btn-primary"
            >
              Try again
            </button>
          </motion.div>
        ) : recyclingHistory.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-white/20 text-6xl mb-4">♻️</div>
            <h3 className="text-lg font-semibold text-white mb-2">No recycling history yet</h3>
            <p className="text-text-light">Start your first recycling request to see your history here</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recyclingHistory.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {req.image ? (
                      <img 
                        src={req.image} 
                        alt={req.category} 
                        className="w-20 h-20 object-cover rounded-lg border border-white/10"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-white/50 text-2xl">
                        ♻️
                      </div>
                    )}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-white">
                        {req.category} • {req.quantity}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-text-light">
                          {formatDate(req.createdAt)}
                        </span>
                        {req.vendor?.name && (
                          <span className="text-text-light">
                            Vendor: {req.vendor.name}
                          </span>
                        )}
                        {req.postRecyclingChoice && (
                          <span className="px-2 py-0.5 rounded-full bg-eco-green/10 text-eco-green text-xs font-medium">
                            {req.postRecyclingChoice === 'sell' ? 'Sell on Store' : 'Get Product Back'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-sm font-medium capitalize ${getRequestStatusColor(req.status)}`}>
                      {getRequestStatusLabel(req.status)}
                    </span>
                    {req.finalReward > 0 && (
                      <span className="text-eco-green font-bold text-lg">
                        +${req.finalReward.toFixed(2)}
                      </span>
                    )}
                    {!req.finalReward && req.estimatedReward > 0 && (
                      <span className="text-text-light font-medium">
                        Est. ${req.estimatedReward.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}