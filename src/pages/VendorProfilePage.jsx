import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, MessageSquare, Package, ArrowLeft, Briefcase, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { vendorApi, chatApi, requestApi, storeApi, reviewApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { categories } from '../data/mockData';

export function VendorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [form, setForm] = useState({ category: 'Plastic', quantity: '', address: '', notes: '', pickupDate: '' });
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    vendorApi.get(id).then(({ data }) => setVendor(data));
    storeApi.vendorProducts(id).then(({ data }) => setProducts(data));
    reviewApi.vendor(id).then(({ data }) => setReviews(data)).catch(() => {});
  }, [id]);

  const startChat = async () => {
    if (!currentUser) return navigate('/login');
    try {
      const { data } = await chatApi.createThread({ vendorId: id });
      navigate(`/chat/${data.threadId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start chat');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.quantity.trim()) newErrors.quantity = 'Quantity is required';
    if (!form.address.trim()) newErrors.address = 'Pickup address is required';
    if (!imageFile && !form.imageUrl) newErrors.image = 'An image of the recyclables is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!currentUser) return navigate('/login');
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const fd = new FormData();
    fd.append('vendorId', id);
    fd.append('category', form.category);
    fd.append('quantity', form.quantity);
    fd.append('address', form.address);
    fd.append('notes', form.notes);
    if (form.pickupDate) fd.append('pickupDate', form.pickupDate);
    if (imageFile) fd.append('image', imageFile);
    
    try {
      await requestApi.create(fd);
      toast.success('Request submitted!');
      setShowRequestForm(false);
      setForm({ category: 'Plastic', quantity: '', address: '', notes: '', pickupDate: '' });
      setImageFile(null);
      setErrors({});
      navigate('/dashboard/requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  };

  if (!vendor) return <div className="container mx-auto py-32 text-center text-text-light">Loading...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-6 lg:px-12 py-28 space-y-8">
      <button
        type="button"
        onClick={() => navigate('/vendors')}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-eco-green/40 hover:bg-eco-green/10"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Vendors
      </button>

      <div className="glass-card p-8 grid lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          {vendor.photo ? (
            <img 
              src={vendor.photo} 
              alt={vendor.name} 
              className="w-full aspect-square object-cover rounded-2xl"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="w-full aspect-square bg-white/10 rounded-2xl flex items-center justify-center" style={{ display: vendor.photo ? 'none' : 'flex' }}>
            <div className="w-32 h-32 bg-eco-green/20 rounded-full flex items-center justify-center">
              <span className="text-6xl text-eco-green">♻️</span>
            </div>
          </div>
        </motion.div>
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-white">{vendor.name}</h1>
          <p className="text-text-light flex items-center gap-2 mt-2"><MapPin className="w-4 h-4" /> {vendor.location}</p>
          <div className="flex items-center gap-2 mt-2">
            <Star className="w-5 h-5 text-yellow-accent fill-yellow-accent" />
            <span className="text-white font-medium">{vendor.rating}</span>
            <span className="text-text-light">({vendor.reviews} reviews)</span>
          </div>
          <p className="text-text-light mt-4 leading-relaxed">{vendor.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {vendor.specialization?.map((s) => (
              <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-text-light">{s}</span>
            ))}
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={startChat} className="btn-secondary flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Chat</button>
            <button onClick={() => setShowRequestForm(true)} className="btn-primary flex items-center gap-2"><Package className="w-5 h-5" /> Request Pickup</button>
          </div>
        </div>
      </div>

      {showRequestForm && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mt-8">
          <h2 className="text-xl font-bold text-white mb-6">New Recycling Request</h2>
          <form onSubmit={submitRequest} className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-1 space-y-1">
              <label className="text-sm text-text-light">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass-input w-full">
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-sm text-text-light">Quantity</label>
              <input placeholder="Quantity (e.g. 50 kg)" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="glass-input w-full" />
              {errors.quantity && <p className="text-red-400 text-sm">{errors.quantity}</p>}
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm text-text-light">Pickup Address</label>
              <input placeholder="Pickup address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="glass-input w-full" />
              {errors.address && <p className="text-red-400 text-sm">{errors.address}</p>}
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-sm text-text-light">Pickup Date (Optional)</label>
              <input type="date" value={form.pickupDate} onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} className="glass-input w-full" />
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-sm text-text-light">Upload Image</label>
              <div className="p-3 border border-white/20 rounded-xl bg-white/5">
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0])} className="text-sm text-text-light w-full" />
              </div>
              {errors.image && <p className="text-red-400 text-sm">{errors.image}</p>}
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm text-text-light">Notes (Optional)</label>
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="glass-input w-full min-h-[100px]" />
            </div>
            <button type="submit" className="btn-primary md:col-span-2 mt-2">Submit Request</button>
          </form>
        </motion.div>
      )}

      {vendor.portfolio?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-eco-green" /> Portfolio
          </h2>
          <p className="text-sm text-text-light">Before & after — see how this vendor transforms recycled waste.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vendor.portfolio.map((item, index) => (
              <div key={`${item.description}-${index}`} className="glass-card overflow-hidden">
                <div className="relative h-48 flex">
                  <div className="w-1/2 relative">
                    <img src={item.before} alt="Before" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-dark-bg/80 px-2 py-1 rounded text-xs font-medium border border-white/10 text-white">
                      Before
                    </span>
                  </div>
                  <div className="w-1/2 relative">
                    <img src={item.after} alt="After" className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 bg-eco-green/90 px-2 py-1 rounded text-xs font-medium text-white">
                      After
                    </span>
                  </div>
                </div>
                <p className="p-4 text-sm text-text-light">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-eco-green" />
            Recycled Products
          </h2>
          <p className="text-sm text-text-light">Products created from recycled materials by this vendor.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product, index) => (
              <motion.div
                key={product.id || product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card overflow-hidden group"
              >
                <div className="relative">
                  <img
                    src={product.images?.[0]}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-eco-green text-dark-bg px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    In Stock
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-white truncate">{product.title}</h3>
                  <p className="text-sm text-text-light line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-eco-green font-bold text-lg">${product.price.toFixed(2)}</span>
                    <Link
                      to={`/store/${product.id || product._id}`}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">Reviews ({reviews.length})</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < r.rating ? 'text-yellow-accent fill-yellow-accent' : 'text-white/20'}`}
                      />
                    ))}
                  </div>
                  <span className="text-white font-medium">{r.rating}.0</span>
                  <span className="text-text-light text-sm ml-auto">
                    {new Date(r.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-white text-sm font-medium mb-2">{r.user}</p>
                {r.comment && (
                  <p className="text-text-light text-sm mb-3">{r.comment}</p>
                )}
                {r.vendorReply && (
                  <div className="bg-white/5 border border-eco-green/20 rounded-lg p-3 mt-3">
                    <p className="text-eco-green text-xs font-semibold mb-1">Vendor Reply:</p>
                    <p className="text-text-light text-sm">{r.vendorReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}
