import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageCircle, Clock, CheckCircle2, Truck, User, ArrowRight, Upload, X } from 'lucide-react';
import { requestApi, riderApi, chatApi, storeApi } from '../../api';
import { getSocket } from '../../lib/socket';

const STATUS_PIPELINE = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-yellow-400' },
  { key: 'vendor_accepted', label: 'Accepted', icon: CheckCircle2, color: 'text-blue-400' },
  { key: 'admin_approved', label: 'Approved', icon: CheckCircle2, color: 'text-eco-green' },
  { key: 'rider_assigned', label: 'Rider Assigned', icon: Truck, color: 'text-sky-400' },
  { key: 'rider_on_pickup', label: 'Rider is on the way', icon: Truck, color: 'text-orange-400' },
  { key: 'rider_picked_up', label: 'Picked Up', icon: CheckCircle2, color: 'text-purple-400' },
  { key: 'waste_received', label: 'Waste Delivered', icon: CheckCircle2, color: 'text-eco-green' },
];

function StatusBadge({ status }) {
  const statusLabel = {
    'rider_assigned': 'Rider Assigned',
    'rider_on_pickup': 'Rider is on the way',
    'rider_picked_up': 'Picked Up',
    'waste_received': 'Waste Delivered',
    'recycling_started': 'Recycling Started',
    'recycling_completed': 'Recycling Complete',
    'return_requested': 'Return Requested',
    'return_rider_assigned': 'Return Rider Assigned',
    'return_on_way': 'Return On the Way',
    'product_returned': 'Return Complete',
  };
  const label = statusLabel[status] || status.replace('_', ' ');
  const color = {
    'rider_assigned': 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    'rider_on_pickup': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'rider_picked_up': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    'waste_received': 'text-eco-green bg-eco-green/10 border-eco-green/20',
  };
  const Icon = {
    'rider_assigned': Truck,
    'rider_on_pickup': Truck,
    'rider_picked_up': CheckCircle2,
    'waste_received': CheckCircle2,
  }[status] || CheckCircle2;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${color[status] || 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export function IncomingRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [riders, setRiders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    title: '', description: '', price: '', productStatus: 'good', recycleType: ''
  });
  const [productImages, setProductImages] = useState([]);
  const [productLoading, setProductLoading] = useState(false);

  const load = async () => {
    try {
      const [{ data: requestsData }, { data: ridersData }] = await Promise.all([
        requestApi.incoming(),
        riderApi.list(),
      ]);
      setRequests(requestsData);
      setRiders(ridersData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

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

    const handleRequestUpdate = (data) => {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === data.requestId ? { ...r, status: data.status } : r
        )
      );
      setSelected((prev) =>
        prev?.id === data.requestId ? { ...prev, status: data.status } : prev
      );
    };

    socket.on('rider_status_changed', handleStatusChange);
    socket.on('rider_profile_updated', handleProfileUpdate);
    socket.on('request_status_changed', handleRequestUpdate);

    return () => {
      socket.off('rider_status_changed', handleStatusChange);
      socket.off('rider_profile_updated', handleProfileUpdate);
      socket.off('request_status_changed', handleRequestUpdate);
    };
  }, []);

  const startChat = async () => {
    try {
      const { data } = await chatApi.createThread({ userId: selected.userId });
      navigate(`/chat/${data.threadId}`);
    } catch (err) {
      toast.error('Failed to start chat');
    }
  };

  const handleVendorAction = async (action) => {
    try {
      const res = await requestApi.vendorAction(selected.id, action);
      setRequests(requests.map(r => r.id === selected.id ? res.data : r));
      setSelected(res.data);
      toast.success(`Request ${action}ed!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleAssignRider = async (riderId) => {
    try {
      let res;
      if (selected.status === 'return_requested' || selected.status === 'return_approved') {
        res = await requestApi.assignReturnRider(selected.id, riderId);
      } else {
        res = await requestApi.assignRider(selected.id, riderId);
      }
      setRequests(requests.map(r => r.id === selected.id ? res.data : r));
      setSelected(res.data);
      toast.success('Rider assigned!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign rider');
    }
  };

  const handleReturnAction = async (action) => {
    try {
      let reason;
      if (action === 'reject') {
        reason = prompt('Please enter a reason for rejecting the return request:');
        if (!reason) {
          toast.error('Reason is required');
          return;
        }
      }
      const res = await requestApi.returnAction(selected.id, { action, reason });
      setRequests(requests.map(r => r.id === selected.id ? res.data : r));
      setSelected(res.data);
      toast.success(`Return request ${action}ed!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return action');
    }
  };

  const handleRecyclingProgress = async (action, estimatedDays = 3) => {
    try {
      const res = await requestApi.updateRecyclingProgress(selected.id, {
        action,
        estimatedCompletionDays: action === 'start' ? estimatedDays : undefined,
      });
      setRequests(requests.map(r => r.id === selected.id ? res.data : r));
      setSelected(res.data);
      toast.success(`Recycling ${action}ed!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const addProduct = async () => {
    try {
      setProductLoading(true);
      const formData = new FormData();
      formData.append('title', productForm.title);
      formData.append('description', productForm.description);
      formData.append('price', productForm.price);
      formData.append('productStatus', productForm.productStatus);
      formData.append('recycleType', productForm.recycleType);
      productImages.forEach(img => formData.append('images', img));

      const { data } = await storeApi.createFromRequest(selected.id, formData);
      toast.success('Recycled product added successfully!');
      setShowProductModal(false);
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product');
    } finally {
      setProductLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    await addProduct();
  };

  const handleProductImageChange = (e) => {
    const files = Array.from(e.target.files);
    setProductImages(files);
  };

  const removeProductImage = (index) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (showProductModal && selected) {
      setProductForm({
        title: `Recycled ${selected.category}`,
        description: '',
        price: String(selected.estimatedReward || 25),
        productStatus: 'good',
        recycleType: selected.category,
      });
      setProductImages([]);
    }
  }, [showProductModal, selected]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid gap-4">
        {requests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setSelected(req)}
            className="glass-card p-5 cursor-pointer hover:border-white/20"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-semibold text-sm">{req.category} • {req.quantity}</h3>
                  <StatusBadge status={req.status} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-text-light">
                  {req.user?.name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {req.user.name}
                    </span>
                  )}
                  {req.rider?.name && (
                    <span className="flex items-center gap-1 text-eco-green">
                      <Truck className="w-3 h-3" /> Rider: {req.rider.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-eco-green font-bold">Details</span>
                <ArrowRight className="w-4 h-4 text-eco-green" />
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selected && !showProductModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex justify-end bg-black/50"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border-l border-white/10 p-6 h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Request Details</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-text-light"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
              {selected.image && <img src={selected.image} alt="" className="w-full h-48 object-cover rounded-xl mb-4" />}
              <p className="text-text-light text-sm mb-2"><strong>Address:</strong> {selected.address}</p>
              <p className="text-text-light text-sm mb-2"><strong>Quantity:</strong> {selected.quantity}</p>
              <p className="text-text-light text-sm mb-2"><strong>Notes:</strong> {selected.notes}</p>

              <button
                onClick={startChat}
                className="btn-secondary w-full mb-4 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat with User
              </button>

              {selected.rider && (
                <p className="text-eco-green text-sm mb-2"><strong>Assigned Rider:</strong> {selected.rider.name}</p>
              )}
              {selected.recyclingStartedAt && (
                <p className="text-text-light text-sm mb-2">
                  <strong>Recycling Started:</strong> {new Date(selected.recyclingStartedAt).toLocaleString()}
                  {selected.estimatedCompletionDays && (
                    <>
                      <br /><strong>Est. Completion:</strong> {selected.estimatedCompletionDays} days
                    </>
                  )}
                </p>
              )}

              <div className="flex flex-col gap-3">
                {selected.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleVendorAction('accept')} className="btn-primary flex-1">Accept</button>
                    <button onClick={() => handleVendorAction('reject')} className="btn-secondary flex-1 text-red-400">Reject</button>
                  </div>
                )}
                {(selected.status === 'admin_approved' || selected.status === 'return_requested') && (
                  <div>
                    <label className="text-xs text-text-light mb-1 block">
                      {selected.status === 'return_requested' ? 'Assign Return Rider' : 'Assign Rider'}
                    </label>
                    <select
                      onChange={(e) => handleAssignRider(e.target.value)}
                      className="glass-input w-full mb-2"
                      defaultValue=""
                    >
                      <option value="" disabled>Select Rider</option>
                      {riders.filter(rider => rider.status === 'active').map((rider) => (
                        <option key={rider.id} value={rider.id}>
                          {rider.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selected.status === 'waste_received' && (
                  <div>
                    <input
                      type="number"
                      placeholder="Estimated Days"
                      className="glass-input w-full mb-2"
                      min={1}
                      defaultValue={3}
                      id="estimated-days"
                    />
                    <button
                      onClick={() => handleRecyclingProgress('start', Number(document.getElementById('estimated-days').value))}
                      className="btn-primary w-full"
                    >
                      Start Recycling
                    </button>
                  </div>
                )}
                {selected.status === 'recycling_started' && (
                  <button onClick={() => handleRecyclingProgress('complete')} className="btn-primary w-full">
                    Mark Recycling Complete
                  </button>
                )}
                {selected.status === 'return_requested' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleReturnAction('approve')} className="btn-primary flex-1">
                      Approve Return
                    </button>
                    <button onClick={() => handleReturnAction('reject')} className="btn-secondary flex-1 text-red-400">
                      Reject Return
                    </button>
                  </div>
                )}
                {selected.status === 'recycling_completed' && !selected.recycledProductId && (
                  <button onClick={() => setShowProductModal(true)} className="btn-primary w-full">
                    Add Recycled Product
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showProductModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add Recycled Product</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 text-text-light hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={e => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="e.g., Recycled Plastic Chair"
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Describe your recycled product..."
                  rows={3}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={productForm.price}
                  onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light mb-1">Condition</label>
                <select
                  value={productForm.productStatus}
                  onChange={e => setProductForm({ ...productForm, productStatus: e.target.value })}
                  className="glass-input w-full"
                >
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light mb-1">Recycle Type</label>
                <input
                  type="text"
                  value={productForm.recycleType}
                  onChange={e => setProductForm({ ...productForm, recycleType: e.target.value })}
                  placeholder="e.g., Plastic, Metal, Paper"
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light mb-1">Product Images</label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-eco-green transition-colors">
                    <Upload className="w-6 h-6 text-text-light" />
                    <span className="text-sm text-text-light">Click to upload images (max 5)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleProductImageChange}
                    />
                  </label>
                  {productImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {productImages.map((img, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`Product ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeProductImage(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="btn-secondary flex-1"
                  disabled={productLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={productLoading}
                >
                  {productLoading ? 'Adding Product...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
