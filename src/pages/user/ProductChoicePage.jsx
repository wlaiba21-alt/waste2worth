import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Store, Home, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { storeApi } from '../../api';

export function ProductChoicePage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [returnAddress, setReturnAddress] = useState('');

  useEffect(() => {
    if (productId) {
      storeApi.product(productId).then(({ data }) => {
        setSelected(data);
        setProducts([data]);
      });
    } else {
      storeApi.awaitingChoice().then(({ data }) => setProducts(data));
    }
  }, [productId]);

  const handleChoice = async (id, choice) => {
    setLoading(true);
    try {
      await storeApi.makeChoice(id, { 
        choice, 
        returnAddress: choice === 'take_back' ? returnAddress : undefined 
      });
      toast.success(choice === 'take_back' ? 'You will receive your product back!' : 'Product listed in store!');
      setProducts((p) => p.filter((x) => x.id !== id));
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const list = selected ? [selected] : products;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:border-eco-green/50 hover:bg-eco-green/10 hover:shadow-lg hover:shadow-eco-green/20 active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Your Recycled Product</h1>
        <p className="text-text-light text-sm mt-1">Take it back or let others buy it from the store — you earn 25% on each sale.</p>
      </motion.div>

      {list.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-12 h-12 text-text-light/40 mx-auto mb-4" />
          <p className="text-text-light">No products awaiting your decision.</p>
          <Link to="/dashboard" className="text-eco-green text-sm mt-4 inline-block hover:underline">Back to dashboard</Link>
        </div>
      ) : (
        list.map((p) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 grid md:grid-cols-2 gap-6">
            <img src={p.images?.[0]} alt={p.title} className="w-full h-56 object-cover rounded-xl" />
            <div>
              <h2 className="text-xl font-bold text-white">{p.title}</h2>
              <p className="text-text-light text-sm mt-2">{p.description}</p>
              <p className="text-eco-green font-bold mt-4">Listed price: ${p.price?.toFixed(2)}</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm text-text-light mb-2">Return Address (optional)</label>
                  <input
                    type="text"
                    value={returnAddress}
                    onChange={(e) => setReturnAddress(e.target.value)}
                    placeholder="Enter delivery address for returning the product"
                    className="w-full glass-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    disabled={loading}
                    onClick={() => handleChoice(p.id, 'take_back')}
                    className="btn-secondary flex flex-col items-center gap-2 py-4"
                  >
                    <Home className="w-6 h-6" />
                    Take Back
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleChoice(p.id, 'list_for_sale')}
                    className="btn-primary flex flex-col items-center gap-2 py-4"
                  >
                    <Store className="w-6 h-6" />
                    List in Store
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
