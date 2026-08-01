import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Check, XCircle, Upload, Phone, Mail, Lock, Loader2, Briefcase, MapPin } from 'lucide-react';
import { vendorApi } from '../../api';
import { toast } from 'sonner';
import { categories } from '../../data/mockData';

export function VendorProfile() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [policies, setPolicies] = useState('');
  const [specialization, setSpecialization] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await vendorApi.profile();
      setVendor(data);
      setBusinessName(data.name || '');
      setLocation(data.location || '');
      setDescription(data.description || '');
      setPolicies(data.policies || '');
      setSpecialization(data.specialization || []);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load profile details');
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('photo', file);

    setUploading(true);
    try {
      await vendorApi.updateProfile(formData);
      await loadProfile();
      toast.success('Profile photo updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('businessName', businessName);
      formData.append('location', location);
      formData.append('description', description);
      formData.append('policies', policies);
      formData.append('specialization', JSON.stringify(specialization));

      await vendorApi.updateProfile(formData);
      await loadProfile();
      toast.success('Profile details updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile details');
    } finally {
      setUpdating(false);
    }
  };

  const toggleSpecialization = (category) => {
    setSpecialization((prev) => {
      if (prev.includes(category)) {
        return prev.filter((s) => s !== category);
      } else {
        return [...prev, category];
      }
    });
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
      {/* Profile Card */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-eco-green to-sky-blue" />

          {/* Avatar Area */}
          <div className="relative w-28 h-28 mb-4 group/avatar">
            <div className="w-full h-full rounded-full border-2 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
              {avatarPreview || vendor?.photo ? (
                <img
                  src={avatarPreview || vendor.photo}
                  alt={vendor?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-14 h-14 text-eco-green" />
              )}
            </div>

            {/* Upload Overlay */}
            <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-all duration-300 border border-eco-green/40">
              <Upload className="w-5 h-5 text-eco-green mb-1" />
              <span className="text-[10px] text-white font-medium">Upload</span>
              <input
                type="file"
                onChange={handleAvatarChange}
                className="hidden"
                accept="image/*"
                disabled={uploading}
              />
            </label>

            {uploading && (
              <div className="absolute inset-0 bg-black/75 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-eco-green animate-spin" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">{vendor?.name}</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize mb-4 bg-white/5 text-text-light border border-white/10">
            Vendor
          </div>

          <div className="w-full border-t border-white/15 my-3" />

          {/* Stats quick overview */}
          <div className="w-full space-y-3 text-left">
            <div className="flex items-center gap-2 text-text-light">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{vendor?.location || 'No location set'}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {vendor?.specialization?.map((s) => (
                <span key={s} className="px-2 py-1 bg-eco-green/10 border border-eco-green/20 rounded-full text-xs text-eco-green">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Edit Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card p-6 lg:p-8 flex flex-col">
          <div className="border-b border-white/10 pb-4 mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Profile Details</h3>
            <p className="text-text-light text-sm">Update your vendor profile information.</p>
          </div>

          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <label className="text-xs text-text-light font-semibold">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                className="glass-input w-full"
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs text-text-light font-semibold">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Your location (e.g., New York, NY)"
                className="glass-input w-full"
              />
            </div>

            {/* Specialization */}
            <div className="space-y-2">
              <label className="text-xs text-text-light font-semibold">Recycling Specialization</label>
              <p className="text-sm text-text-light/70 mb-3">Select categories you specialize in</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleSpecialization(cat.name)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 ${
                      specialization.includes(cat.name)
                        ? 'border-eco-green bg-eco-green/10 text-eco-green'
                        : 'border-white/10 text-text-light hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {specialization.includes(cat.name) ? <Check className="w-4 h-4" /> : null}
                    <span className="text-sm font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs text-text-light font-semibold">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell users about your recycling services"
                className="glass-input w-full min-h-[120px]"
              />
            </div>

            {/* Policies */}
            <div className="space-y-2">
              <label className="text-xs text-text-light font-semibold">Policies</label>
              <textarea
                value={policies}
                onChange={(e) => setPolicies(e.target.value)}
                placeholder="Your recycling policies (minimum quantity, etc.)"
                className="glass-input w-full min-h-[120px]"
              />
            </div>

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
          </form>
        </div>
      </div>
    </motion.div>
  );
}
