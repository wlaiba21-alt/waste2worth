import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Users, Heart, Leaf } from 'lucide-react';

export function AboutPage() {
  return (
    <motion.div className="w-full">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Transforming Waste Into <br />
              <span className="text-eco-green">Worth</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-text-light mb-10 max-w-3xl mx-auto"
            >
              Waste2Worth is a revolutionary platform that empowers individuals and businesses to recycle responsibly while earning rewards. We're building a sustainable future, one transaction at a time.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mt-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-card p-10"
            >
              <Target className="w-16 h-16 text-eco-green mb-6" />
              <h3 className="text-3xl font-bold mb-4">Our Mission</h3>
              <p className="text-text-light text-lg">
                To create a seamless, rewarding recycling ecosystem that incentivizes waste reduction, empowers waste collectors, and connects them with businesses that value sustainable materials. We aim to make recycling accessible, profitable, and impactful for everyone.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-card p-10"
            >
              <Leaf className="w-16 h-16 text-eco-green mb-6" />
              <h3 className="text-3xl font-bold mb-4">Our Vision</h3>
              <p className="text-text-light text-lg">
                A world where waste is viewed as a valuable resource, not a burden. Where every individual can contribute to environmental sustainability while earning a fair income, and where waste management transforms into a thriving circular economy.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-dark-card/50 border-y border-white/5">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How Waste2Worth Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { number: '1', title: 'Submit Your Waste', desc: 'Users submit photos and details of waste materials they want to recycle, along with quantity and location.' },
              { number: '2', title: 'Get Verified', desc: 'Our network of verified vendors reviews and accepts requests, assessing the quality and feasibility of collection.' },
              { number: '3', title: 'Earn Rewards', desc: 'Upon successful recycling, users earn credits to their wallet that can be used in our marketplace or converted to cash.' },
              { number: '4', title: 'Transform Products', desc: 'Vendors transform recycled materials into new products that are listed on our store for eco-conscious buyers.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-6 mb-4">
                  <div className="w-12 h-12 bg-eco-green/20 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-eco-green">{step.number}</span>
                  </div>
                  <h3 className="text-2xl font-semibold">{step.title}</h3>
                </div>
                <p className="text-text-light text-lg">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-10"
            >
              <Leaf className="w-16 h-16 text-eco-green mb-6" />
              <h3 className="text-2xl font-bold mb-3">Sustainability</h3>
              <p className="text-text-light text-lg">We are committed to reducing waste and promoting a circular economy for a healthier planet.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card p-10"
            >
              <Users className="w-16 h-16 text-eco-green mb-6" />
              <h3 className="text-2xl font-bold mb-3">Community</h3>
              <p className="text-text-light text-lg">Our platform brings together users, vendors, and partners to create positive environmental impact.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="glass-card p-10"
            >
              <Heart className="w-16 h-16 text-eco-green mb-6" />
              <h3 className="text-2xl font-bold mb-3">Responsibility</h3>
              <p className="text-text-light text-lg">We believe in responsible waste management and rewarding those who contribute to sustainability.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-dark-card/30 border-y border-white/5">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Our Impact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { number: '50K+', label: 'Active Users' },
              { number: '500+', label: 'Verified Vendors' },
              { number: '1M+', label: 'Items Recycled' },
              { number: '100K+', label: 'Transactions' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-10 text-center"
              >
                <div className="text-4xl lg:text-5xl font-bold text-eco-green mb-2">{stat.number}</div>
                <div className="text-text-light text-lg">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-10 text-center"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Join the Waste2Worth Movement</h2>
            <p className="text-text-light text-xl mb-8 max-w-2xl mx-auto">
              Start recycling today and earn rewards while making a positive impact on our planet. Whether you're a casual recycler or a business partner, there's a place for you in our community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-lg">
                Get Started Today
              </Link>
              <Link to="/vendors" className="btn-secondary flex items-center justify-center text-lg">
                Become a Vendor
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
