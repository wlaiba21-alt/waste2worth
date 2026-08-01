import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Leaf, Store, Edit, Trash2, X, Save, Star } from 'lucide-react';
import { storeApi, reviewApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

function EditProductModal({ product, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.price,
    recycleType: product.recycleType || product.category,
    productStatus: product.productStatus || 'good',
    isAvailable: product.isAvailable ?? true,
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([...(product.images || [])]);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('recycleType', formData.recycleType);
      formDataToSend.append('productStatus', formData.productStatus);
      formDataToSend.append('isAvailable', formData.isAvailable);
      
      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          formDataToSend.append('images', file);
        });
      } else if (product.images && product.images.length > 0) {
        formDataToSend.append('images', JSON.stringify(product.images));
      }
      
      await storeApi.updateProduct(product.id || product._id, formDataToSend);
      onSave();
      toast.success('Product updated successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Edit Product</h3>
          <button onClick={onClose} className="text-text-light hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-light mb-1">Product Images</label>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange} 
              className="glass-input w-full" 
            />
            {previewUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {previewUrls.map((url, index) => (
                  <img key={index} src={url} alt={`Preview ${index + 1}`} className="w-full h-16 object-cover rounded" />
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-text-light mb-1">Title</label>
            <input 
              type="text" 
              required 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})} 
              className="glass-input w-full" 
            />
          </div>
          <div>
            <label className="block text-sm text-text-light mb-1">Description</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              className="glass-input w-full min-h-[100px]" 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-light mb-1">Category</label>
              <input 
                type="text" 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})} 
                className="glass-input w-full" 
              />
            </div>
            <div>
              <label className="block text-sm text-text-light mb-1">Recycle Type</label>
              <input 
                type="text" 
                value={formData.recycleType} 
                onChange={(e) => setFormData({...formData, recycleType: e.target.value})} 
                className="glass-input w-full" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-light mb-1">Price (USD)</label>
              <input 
                type="number" 
                required 
                min="0" 
                step="0.01" 
                value={formData.price} 
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})} 
                className="glass-input w-full" 
              />
            </div>
            <div>
              <label className="block text-sm text-text-light mb-1">Product Condition</label>
              <select 
                value={formData.productStatus} 
                onChange={(e) => setFormData({...formData, productStatus: e.target.value})} 
                className="glass-input w-full"
              >
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isAvailable" 
              checked={formData.isAvailable} 
              onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})} 
              className="w-4 h-4"
            />
            <label htmlFor="isAvailable" className="text-sm text-text-light">Product is available in store</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function StoreProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reviews, setReviews] = useState([]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const { data } = await storeApi.product(id);
      setProduct(data);
    } catch (err) {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setDeleting(true);
    try {
      await storeApi.deleteProduct(id);
      toast.success('Product deleted successfully');
      navigate('/store');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadProduct();
    // Load reviews for this product
    reviewApi.product(id).then(({ data }) => setReviews(data)).catch(() => {});
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-text-light">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-20">
        <p className="text-text-light">Product not found.</p>
        <button type="button" onClick={() => navigate('/store')} className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </button>
      </div>
    );
  }

  const ownerId = String(product.ownerUserId || '');
  const userId = String(currentUser?.id || currentUser?._id || '');
  const isOwner = Boolean(userId && ownerId && userId === ownerId);
  const vendorId = String(product.vendorId || '');
  const isVendor = Boolean(userId && vendorId && userId === vendorId);
  const canManage = isOwner || isVendor || currentUser?.role === 'admin';
  const canPurchase =
    currentUser?.role === 'user' && !isOwner && product.status === 'listed';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:border-eco-green/50 hover:bg-eco-green/10 hover:shadow-lg hover:shadow-eco-green/20 active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="glass-card overflow-hidden grid md:grid-cols-2">
        <div className="h-72 md:h-auto min-h-[280px] bg-white/5 flex items-center justify-center">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-text-light/50 text-8xl">🗑️</div>
          )}
        </div>
        <div className="p-8 flex flex-col">
          <span className="inline-flex items-center gap-1 text-xs text-eco-green bg-eco-green/10 px-2 py-1 rounded-full w-fit">
            <Leaf className="w-3 h-3" /> {product.category}
          </span>
          {product.productStatus && (
            <span className="inline-flex items-center gap-1 text-xs text-text-light bg-white/10 px-2 py-1 rounded-full w-fit mt-2">
              Condition: {product.productStatus.replace('_', ' ')}
            </span>
          )}
          {product.recycleType && product.recycleType !== product.category && (
            <span className="inline-flex items-center gap-1 text-xs text-text-light bg-white/10 px-2 py-1 rounded-full w-fit mt-2">
              Recycle Type: {product.recycleType}
            </span>
          )}
          <h1 className="text-2xl font-bold text-white mt-3">{product.title}</h1>
          <p className="text-text-light mt-3 flex-grow">{product.description}</p>
          {product.owner?.name && (
            <p className="text-xs text-text-light mt-3">Donated by {product.owner.name}</p>
          )}
          <p className="text-3xl font-bold text-eco-green mt-6">${product.price?.toFixed(2)}</p>
          <p className="text-xs text-text-light mt-2">25% of sale goes to the user who donated the waste.</p>

          <div className="mt-6 space-y-3">
            {canManage && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(product)}
                  className="btn-secondary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
            
            {canPurchase && (
              <button
                type="button"
                onClick={() => navigate(`/store/${id}/checkout`)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" /> Buy Now
              </button>
            )}

            {!currentUser && product.status === 'listed' && (
              <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Login to Purchase
              </Link>
            )}

            {currentUser && currentUser.role !== 'user' && product.status === 'listed' && !canManage && (
              <p className="text-sm text-text-light rounded-xl border border-white/10 bg-white/5 p-3">
                Sign in as a user account to purchase store items.
              </p>
            )}

            {isOwner && (
              <div className="rounded-xl border border-soft-orange/30 bg-soft-orange/10 p-4 space-y-3">
                <p className="text-sm text-soft-orange">
                  This is your listed product. You earn commission when someone else buys it — you cannot purchase your own item.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/store')}
                  className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                >
                  <Store className="w-4 h-4" /> Browse Other Products
                </button>
              </div>
            )}

            {currentUser?.role === 'user' && !isOwner && product.status !== 'listed' && !canManage && (
              <p className="text-sm text-text-light">This product is not available for purchase right now.</p>
            )}
          </div>
        </div>
      </div>

      {editingProduct && (
        <EditProductModal 
          product={editingProduct} 
          onClose={() => setEditingProduct(null)} 
          onSave={loadProduct} 
        />
      )}

      {reviews.length > 0 && (
        <div className="glass-card p-8 space-y-4">
          <h2 className="text-xl font-bold text-white">Customer Reviews ({reviews.length})</h2>
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-white/10 pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex gap-0.5 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < r.rating ? 'text-yellow-accent fill-yellow-accent' : 'text-white/20'}`}
                        />
                      ))}
                    </div>
                    <p className="text-white font-medium text-sm">{r.user}</p>
                  </div>
                  <span className="text-xs text-text-light">
                    {new Date(r.date).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-text-light text-sm mb-3">{r.comment}</p>
                )}
                {r.vendorReply && (
                  <div className="bg-eco-green/10 border border-eco-green/20 rounded-lg p-3">
                    <p className="text-eco-green text-xs font-semibold mb-1">Seller Response:</p>
                    <p className="text-text-light text-sm">{r.vendorReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
