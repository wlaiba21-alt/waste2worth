import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Leaf, ShieldCheck, Zap, Newspaper, Milk, Anvil, GlassWater, CircleDashed, Shirt, Star } from 'lucide-react';
import { categories } from '../data/mockData';
import { vendorApi } from '../api';

const iconMap = {
  Newspaper,
  Bottle: Milk,
  Anvil,
  GlassWater,
  CircleDashed,
  Shirt,
};

export function LandingPage() {
  const [topVendors, setTopVendors] = useState([]);
  const [vendorCount, setVendorCount] = useState(0);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    setVendorsLoading(true);
    vendorApi.list()
      .then(({ data }) => {
        if (data && Array.isArray(data)) {
          setVendorCount(data.length);
          const sorted = [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0));
          setTopVendors(sorted.slice(0, 3));
        } else {
          setVendorCount(0);
          setTopVendors([]);
        }
      })
      .catch(() => {
        setVendorCount(0);
        setTopVendors([]);
      })
      .finally(() => {
        setVendorsLoading(false);
      });
  }, []);

  const handleImageError = (vendorId) => {
    setFailedImages(prev => ({ ...prev, [vendorId]: true }));
  };

  return (
    <motion.div className="w-full">
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-eco-green/10 border border-eco-green/20 text-eco-green text-sm font-medium mb-6"
            >
              <Leaf className="w-4 h-4" />
              <span>Smart Recycling Marketplace</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold leading-tight mb-6"
            >
              Transform <span className="text-transparent bg-clip-text bg-gradient-to-r from-eco-green to-eco-light">Waste</span> into <br />
              Valuable Worth.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-text-light mb-10 max-w-2xl leading-relaxed"
            >
              Connect with certified recycling vendors, track your environmental impact, and earn rewards. The AI-powered platform for a sustainable future.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/vendors" className="btn-primary flex items-center justify-center gap-2 text-lg">
                Find a Vendor <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/register" className="btn-secondary flex items-center justify-center text-lg">
                Become a Partner
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full hidden lg:block opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-dark-bg z-10" />
          <img
            src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=1200"
            alt="Recycling Facility"
            className="w-full h-full object-cover rounded-l-3xl"
          />
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-dark-card/50 border-y border-white/5">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-text-light">A seamless process from waste collection to valuable resources.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Leaf, title: '1. Classify Waste', desc: 'Use our AI to identify and categorize your waste materials instantly.' },
              { icon: Zap, title: '2. Connect', desc: 'Match with the best local vendors specializing in your waste type.' },
              { icon: ShieldCheck, title: '3. Recycle & Earn', desc: 'Vendors pick up or you drop off. Track progress and earn rewards.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 text-center"
              >
                <div className="w-16 h-16 bg-eco-green/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-8 h-8 text-eco-green" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-text-light">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Waste Categories</h2>
            <p className="text-text-light">We handle a wide variety of recyclable materials.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Leaf;
              return (
                <Link key={cat.id} to={`/vendors?category=${cat.id}`}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="glass-card p-6 flex flex-col items-center justify-center gap-4 hover:border-eco-green/50 transition-colors group cursor-pointer h-full"
                  >
                    <div className="p-4 bg-white/5 rounded-full group-hover:bg-eco-green/20 transition-colors">
                      <Icon className="w-8 h-8 text-text-light group-hover:text-eco-green transition-colors" />
                    </div>
                    <span className="font-medium text-white group-hover:text-eco-green transition-colors">{cat.name}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
          </div>
      </section>

      <section className="py-20 bg-dark-card/30 border-y border-white/5">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Top Rated Vendors</h2>
              <p className="text-text-light">Partner with the best in the business.</p>
            </div>
            <Link to="/vendors" className="text-eco-green hover:text-eco-light font-medium flex items-center gap-2 transition-colors hidden sm:flex">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {vendorsLoading ? (
            <p className="text-center text-text-light py-12">Loading vendors...</p>
          ) : topVendors.length === 0 ? (
            <p className="text-center text-text-light py-12">No vendors available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {topVendors.map((vendor, i) => (
                <motion.div
                  key={vendor.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card overflow-hidden group flex flex-col"
                >
                  <div className="h-48 overflow-hidden relative">
                    {vendor.photo && !failedImages[vendor.id] ? (
                      <img
                        src={vendor.photo}
                        alt={vendor.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={() => handleImageError(vendor.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-eco-green flex items-center justify-center text-white text-4xl font-bold">
                        {vendor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-dark-bg/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                      <Star className="w-4 h-4 text-yellow-accent fill-yellow-accent" />
                      <span className="text-sm font-medium text-white">{vendor.rating}</span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-semibold mb-2 text-white">{vendor.name}</h3>
                    <p className="text-text-light text-sm mb-4 line-clamp-2">{vendor.description}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {vendor.specialization?.map((spec) => (
                        <span key={spec} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-md text-text-light">
                          {spec}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/10">
                      <Link to={`/vendors/${vendor.id}`} className="text-eco-green hover:text-eco-light font-medium text-sm flex items-center justify-between transition-colors">
                        View Profile <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="mt-8 text-center sm:hidden">
            <Link to="/vendors" className="btn-secondary inline-flex items-center gap-2">
              View All Vendors <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-eco-green/5" />
        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { label: 'Certified Vendors', value: vendorCount > 0 ? `${vendorCount}+` : '—' },
              { label: 'Waste Categories', value: `${categories.length}` },
              { label: 'Smart Matching', value: 'AI' },
            ].map((stat, i) => (
              <div key={i} className="p-6">
                  <div className="text-4xl lg:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-eco-green font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
