import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Search } from 'lucide-react';
import { vendorApi } from '../api';
import { categories } from '../data/mockData';

export function VendorsPage() {
  const [searchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    vendorApi
      .list({ category: category !== 'all' ? category : undefined, search: search || undefined })
      .then(({ data }) => setVendors(data))
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <div className="pb-20">
      <div className="bg-dark-card/50 border-b border-white/5 pt-28 md:pt-32 pb-8 mb-12">
        <div className="container mx-auto px-6 lg:px-12">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Vendor Marketplace</h1>
          <p className="text-text-light max-w-2xl">Find certified recycling partners for your waste.</p>
          <div className="relative max-w-md mt-6">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-text-light" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              className="glass-input has-left-icon w-full"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setCategory('all')} className={`px-4 py-2 rounded-full text-sm border ${category === 'all' ? 'bg-eco-green border-eco-green text-white' : 'border-white/10 text-text-light'}`}>All</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={`px-4 py-2 rounded-full text-sm border ${category === c.id ? 'bg-eco-green border-eco-green text-white' : 'border-white/10 text-text-light'}`}>{c.name}</button>
          ))}
        </div>

        {loading ? (
          <p className="text-text-light text-center py-12">Loading vendors...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor, i) => (
              <motion.div key={vendor.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/vendors/${vendor.id}`} className="glass-card block overflow-hidden hover:border-eco-green/30 transition-colors group">
                  <div className="h-40 overflow-hidden relative">
                    {vendor.photo ? (
                      <img 
                        src={vendor.photo} 
                        alt={vendor.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full bg-white/5 flex items-center justify-center" style={{ display: vendor.photo ? 'none' : 'flex' }}>
                      <div className="w-20 h-20 bg-eco-green/20 rounded-full flex items-center justify-center">
                        <span className="text-4xl text-eco-green">♻️</span>
                      </div>
                    </div>
                    <motion.div className="absolute top-3 right-3 bg-dark-bg/80 px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
                      <Star className="w-3 h-3 text-yellow-accent fill-yellow-accent" />
                      <span className="text-xs font-medium">{vendor.rating}</span>
                    </motion.div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-white text-lg">{vendor.name}</h3>
                    <p className="text-sm text-text-light flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {vendor.location}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {vendor.specialization?.slice(0, 3).map((spec) => (
                        <span key={spec} className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded text-text-light">{spec}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
