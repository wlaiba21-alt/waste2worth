import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Check, XCircle, Upload, Phone, Mail, Lock, Loader2, Award, Briefcase, Clock } from 'lucide-react';
import { riderApi } from '../../api';
import { toast } from 'sonner';

export function RiderProfile() {
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await riderApi.profile();
      setRider(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load profile details');
      setLoading(false);
    }
  };

  const updateAvailability = async (status) => {
    try {
      const { data } = await riderApi.updateAvailability(status);
      setRider(data);
      toast.success(`Availability updated to ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update availability');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await riderApi.updateProfile(formData);
      setRider(data);
      toast.success('Profile picture updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    if (password && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdating(true);
    try {
      const { data } = await riderApi.updateProfile({
        name,
        phone,
        password: password || undefined,
      });
      setRider(data);
      setPassword('');
      toast.success('Profile details updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile details');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
      case 'available':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'busy':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'inactive':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-white/10 text-text-light border border-white/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
    >
      {/* Profile Card & Availability */}
      <div className="lg:col-span-1 space-y-6">
        {/* Profile Card */}
        <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-eco-green to-sky-blue" />
          
          {/* Avatar Area */}
          <div className="relative w-28 h-28 mb-4 group/avatar">
            <div className="w-full h-full rounded-full border-2 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
              {rider?.avatar ? (
                <img src={rider.avatar} alt={rider.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-eco-green" />
              )}
            </div>
            
            {/* Upload Overlay */}
            <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-all duration-300 border border-eco-green/40">
              <Upload className="w-5 h-5 text-eco-green mb-1" />
              <span className="text-[10px] text-white font-medium">Upload</span>
              <input type="file" onChange={handleAvatarChange} className="hidden" accept="image/*" disabled={uploading} />
            </label>

            {uploading && (
              <div className="absolute inset-0 bg-black/75 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-eco-green animate-spin" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">{rider?.name}</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize mb-4 bg-white/5 text-text-light border border-white/10">
            Rider
          </div>

          <div className="w-full border-t border-white/15 my-3" />

          {/* Stats quick overview */}
          <div className="grid grid-cols-2 gap-4 w-full text-left mt-3">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-text-light block uppercase tracking-wider mb-1">Pickups</span>
              <span className="text-lg font-bold text-white">{rider?.recycleCount || 0}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-text-light block uppercase tracking-wider mb-1">Wallet</span>
              <span className="text-lg font-bold text-eco-green">${(rider?.walletBalance || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Availability Control */}
        <div className="glass-card p-6">
          <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-blue" /> Availability Status
          </h3>
          <p className="text-text-light text-xs mb-4">
            Setting your availability controls how vendors assign you new pickup requests. Update your status in real time.
          </p>

          <div className="space-y-3">
            {/* Active/Available Status */}
            <button
              onClick={() => updateAvailability('active')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                rider?.availabilityStatus === 'active' || rider?.availabilityStatus === 'available'
                  ? 'border-green-500/50 bg-green-500/10 text-white shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                  : 'border-white/10 hover:border-white/20 text-text-light hover:text-white bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-sm">Active / Available</span>
              </div>
              {(rider?.availabilityStatus === 'active' || rider?.availabilityStatus === 'available') && (
                <Check className="w-4 h-4 text-green-400" />
              )}
            </button>

            {/* Busy Status */}
            <button
              onClick={() => updateAvailability('busy')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                rider?.availabilityStatus === 'busy'
                  ? 'border-yellow-500/50 bg-yellow-500/10 text-white shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                  : 'border-white/10 hover:border-white/20 text-text-light hover:text-white bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="font-semibold text-sm">Busy / On Route</span>
              </div>
              {rider?.availabilityStatus === 'busy' && (
                <Check className="w-4 h-4 text-yellow-400" />
              )}
            </button>

            {/* Inactive Status */}
            <button
              onClick={() => updateAvailability('inactive')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                rider?.availabilityStatus === 'inactive'
                  ? 'border-red-500/50 bg-red-500/10 text-white shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                  : 'border-white/10 hover:border-white/20 text-text-light hover:text-white bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="font-semibold text-sm">Inactive / Offline</span>
              </div>
              {rider?.availabilityStatus === 'inactive' && (
                <Check className="w-4 h-4 text-red-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details Edit Form */}
      <div className="lg:col-span-2">
        <div className="glass-card p-6 lg:p-8 flex flex-col">
          <div className="border-b border-white/10 pb-4 mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Profile Details</h3>
            <p className="text-text-light text-sm">Update your contact details and account settings.</p>
          </div>

          <form onSubmit={handleDetailsSubmit} className="space-y-8">
            <div className="space-y-7">
              {/* Name field */}
              <div className="space-y-3">
                <label className="text-xs text-text-light block font-semibold">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="glass-input has-left-icon w-full"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-3">
                <label className="text-xs text-text-light block font-semibold">Email Address</label>
                <div className="relative opacity-65">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                  <input
                    readOnly
                    type="email"
                    value={rider?.email || ''}
                    placeholder="Email address"
                    className="glass-input has-left-icon w-full cursor-not-allowed bg-white/5"
                  />
                </div>
                <span className="text-[10px] text-text-light/70 block mt-1">Email address cannot be changed.</span>
              </div>

              {/* Phone field */}
              <div className="space-y-3">
                <label className="text-xs text-text-light block font-semibold">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="glass-input has-left-icon w-full"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-3">
                <label className="text-xs text-text-light block font-semibold">Change Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="glass-input has-left-icon w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={updating}
                className="btn-primary w-full md:w-auto md:px-8 py-3 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
