

import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Linkedin, Recycle } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="bg-dark-bg border-t border-white/10 pt-16 pb-8">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <Logo className="w-10 h-10" />
              <span className="font-poppins font-bold text-xl tracking-tight text-white">
                Waste<span className="text-eco-green">2</span>Worth
              </span>
            </Link>
            <p className="text-text-light text-sm leading-relaxed">
              Transforming waste into valuable reusable products through smart recycling technology and our trusted vendor network.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a href="#" className="text-text-light hover:text-eco-green transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-text-light hover:text-eco-green transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-text-light hover:text-eco-green transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-text-light hover:text-eco-green transition-colors"><Linkedin className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-poppins font-semibold mb-6">Platform</h4>
            <ul className="flex flex-col gap-3">
              <li><Link to="/vendors" className="text-text-light hover:text-white transition-colors text-sm">Browse Vendors</Link></li>
              <li><Link to="/#how-it-works" className="text-text-light hover:text-white transition-colors text-sm">How it Works</Link></li>
              <li><Link to="/login" className="text-text-light hover:text-white transition-colors text-sm">Vendor Login</Link></li>
              <li><Link to="/register" className="text-text-light hover:text-white transition-colors text-sm">Become a Partner</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-poppins font-semibold mb-6">Recycle</h4>
            <ul className="flex flex-col gap-3">
              <li><Link to="/vendors?category=plastic" className="text-text-light hover:text-white transition-colors text-sm">Plastic</Link></li>
              <li><Link to="/vendors?category=paper" className="text-text-light hover:text-white transition-colors text-sm">Paper & Cardboard</Link></li>
              <li><Link to="/vendors?category=metal" className="text-text-light hover:text-white transition-colors text-sm">Scrap Metal</Link></li>
              <li><Link to="/vendors?category=glass" className="text-text-light hover:text-white transition-colors text-sm">Glass</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-poppins font-semibold mb-6">Contact</h4>
            <ul className="flex flex-col gap-3 text-sm text-text-light">
              <li>support@waste2worth.com</li>
              <li>+1 (555) 123-4567</li>
              <li>123 Eco Street, Suite 100<br />Green City, Earth 90210</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-light text-sm">
            &copy; {new Date().getFullYear()} Waste to Worth. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link to="#" className="text-text-light hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="#" className="text-text-light hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>);

}