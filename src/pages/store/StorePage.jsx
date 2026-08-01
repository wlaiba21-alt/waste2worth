import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, Star } from 'lucide-react';
import { storeApi } from '../../api';

export function StorePage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeApi
      .list({ search: search || undefined })
      .then(({ data }) => setProducts(data))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-eco-green" /> Recycled Products Store
          </h1>
          <p className="text-text-light text-sm mt-1">Buy unique items made from recycled waste. Profits shared with original donors.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="relative max-w-xs w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-text-light" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="glass-input has-left-icon w-full py-2"
          />
        </motion.div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-light">Loading store...</div>
      ) : products.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-text-light/40 mx-auto mb-4" />
          <p className="text-text-light">No products listed yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/store/${p.id}`} className="glass-card overflow-hidden block hover:border-eco-green/40 transition-colors group">
                <motion.div whileHover={{ scale: 1.02 }} className="h-48 overflow-hidden bg-white/5 flex items-center justify-center">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="text-text-light/50 text-5xl">🗑️</div>
                  )}
                </motion.div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-eco-green uppercase tracking-wider">{p.category}</span>
                    {p.productStatus && (
                      <span className="text-xs text-text-light uppercase tracking-wider">
                        • {p.productStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white mt-1">{p.title}</h3>
                  <p className="text-sm text-text-light line-clamp-2 mt-1">{p.description}</p>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <span className="text-xl font-bold text-eco-green">${p.price?.toFixed(2)}</span>
                    <span className="text-xs text-text-light flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-accent fill-yellow-accent" /> Recycled
                    </span>
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
