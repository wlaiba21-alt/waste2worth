

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Recycle, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { Logo } from './Logo';

export function Navbar() {
  const { currentUser } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Vendors', path: '/vendors' },
  { name: 'Store', path: '/store' },
  { name: 'How it Works', path: '/#how-it-works' }];


  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-dark-bg/80 backdrop-blur-lg border-b border-white/10 py-4' : 'bg-transparent py-6'}`
      }>
      
      <div className="container mx-auto px-6 lg:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo className="w-10 h-10" />
          <span className="font-poppins font-bold text-xl tracking-tight text-white">
            Waste<span className="text-eco-green">2</span>Worth
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
          <Link
            key={link.name}
            to={link.path}
            className="text-text-light hover:text-white transition-colors text-sm font-medium">
            
              {link.name}
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {currentUser ?
          <div className="flex items-center gap-4">
              <Link to={currentUser.role === 'admin' ? '/admin/dashboard' : currentUser.role === 'vendor' ? '/vendor/dashboard' : '/dashboard'} className="flex items-center gap-2 hover:bg-white/5 p-1 pr-3 rounded-full transition-colors border border-white/10">
                <UserAvatar src={currentUser.avatar} name={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm font-medium text-white">{currentUser.name}</span>
                <span className="text-[10px] uppercase tracking-wider bg-eco-green/20 text-eco-green px-2 py-0.5 rounded-full ml-1">{currentUser.role}</span>
              </Link>
            </div> :

          <>
              <Link to="/login" className="text-text-light hover:text-white font-medium text-sm transition-colors">
                Log in
              </Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-5">
                Get Started
              </Link>
            </>
          }
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-text-light hover:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu">
          
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen &&
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-full left-0 right-0 bg-dark-card border-b border-white/10 shadow-2xl md:hidden">
          
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) =>
            <Link
              key={link.name}
              to={link.path}
              className="text-text-light hover:text-white text-lg font-medium py-2 border-b border-white/5">
              
                  {link.name}
                </Link>
            )}
              
              {currentUser ?
            <div className="mt-4 pt-4 border-t border-white/10">
                  <Link to={currentUser.role === 'admin' ? '/admin/dashboard' : currentUser.role === 'vendor' ? '/vendor/dashboard' : '/dashboard'} className="btn-primary text-center w-full block">
                    Go to Dashboard
                  </Link>
                </div> :

            <div className="flex flex-col gap-3 mt-4">
                  <Link to="/login" className="btn-secondary text-center">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary text-center">
                    Get Started
                  </Link>
                </div>
            }
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </header>);

}