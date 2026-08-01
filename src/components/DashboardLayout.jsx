import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Recycle, Menu, X, Search, LogOut, ChevronDown,
  LayoutDashboard, ListOrdered, History, ShoppingBag, MapPin, Star, MessageSquare, ScanLine, User,
  Briefcase, DollarSign, FileText, Users, BarChart3, ShieldAlert, Store, Wallet, Package, Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { UserAvatar } from './UserAvatar';
import { Logo } from './Logo';

const SIDEBAR_ITEMS = {
  user: [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Requests', path: '/dashboard/requests', icon: ListOrdered },
    { name: 'My Return Requests', path: '/dashboard/return-requests', icon: Truck },
    { name: 'Product Choice', path: '/dashboard/product-choice', icon: Package },
    { name: 'Recycling History', path: '/dashboard/history', icon: History },
    { name: 'Store Orders', path: '/dashboard/store-orders', icon: ShoppingBag },
    { name: 'Wallet', path: '/dashboard/wallet', icon: Wallet },
    { name: 'Browse Store', path: '/store', icon: Store },
    { name: 'Addresses', path: '/dashboard/addresses', icon: MapPin },
    { name: 'Reviews', path: '/dashboard/reviews', icon: Star },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'AI Detect', path: '/ai-detect', icon: ScanLine },
    { name: 'Profile', path: '/dashboard/profile', icon: User }
  ],
  vendor: [
    { name: 'Overview', path: '/vendor/dashboard', icon: LayoutDashboard },
    { name: 'Incoming Requests', path: '/vendor/dashboard/requests', icon: ListOrdered },
    { name: 'Return Requests', path: '/vendor/dashboard/return-requests', icon: Truck },
    { name: 'Portfolio', path: '/vendor/dashboard/portfolio', icon: Briefcase },
    { name: 'Store Sales', path: '/dashboard/store-orders', icon: Store },
    { name: 'Earnings', path: '/vendor/dashboard/earnings', icon: DollarSign },
    { name: 'Reviews', path: '/vendor/dashboard/reviews', icon: Star },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Profile', path: '/vendor/dashboard/profile', icon: User }
  ],
  admin: [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/dashboard/users', icon: Users },
    { name: 'Vendors', path: '/admin/dashboard/vendors', icon: Briefcase },
    { name: 'Requests', path: '/admin/dashboard/requests', icon: ListOrdered },
    { name: 'Riders', path: '/admin/dashboard/riders', icon: Truck },
    { name: 'Analytics', path: '/admin/dashboard/analytics', icon: BarChart3 },
    { name: 'Earnings', path: '/admin/dashboard/earnings', icon: DollarSign },
    { name: 'Reports', path: '/admin/dashboard/reports', icon: ShieldAlert }
  ],
  rider: [
    { name: 'Overview', path: '/rider/dashboard', icon: LayoutDashboard },
    { name: 'My Tasks', path: '/rider/dashboard/tasks', icon: ListOrdered },
    { name: 'Profile', path: '/rider/dashboard/profile', icon: User }
  ]
};

export function DashboardLayout() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  if (!currentUser) return null;

  const navItems = SIDEBAR_ITEMS[currentUser.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const item = navItems.find((i) => i.path === location.pathname);
    return item ? item.name : 'Dashboard';
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center gap-3">
        <Logo className="w-11 h-11" />
        <span className="font-poppins font-bold text-xl text-white">
          Waste<span className="text-eco-green">2</span>Worth
        </span>
      </div>

      <div className="px-6 mb-6">
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-text-light border border-white/10 uppercase tracking-wider">
          {currentUser.role} Portal
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-eco-green/10 text-eco-green border-l-2 border-eco-green'
                  : 'text-text-light hover:bg-white/5 hover:text-white border-l-2 border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-eco-green' : 'text-text-light'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
          <UserAvatar
            src={currentUser.avatar}
            name={currentUser.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-text-light truncate">{currentUser.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-text-light hover:text-soft-orange transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 bg-dark-card border-r border-white/10 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-64 bg-dark-card border-r border-white/10 z-50 flex flex-col md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen relative">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-dark-bg/80 backdrop-blur-md border-b border-white/10 h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-text-light hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-white hidden sm:block">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-eco-green w-64"
              />
            </div>

            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 hover:bg-white/5 p-1 pr-2 rounded-full transition-colors"
              >
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <ChevronDown className="w-4 h-4 text-text-light" />
              </button>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-dark-card border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50"
                  >
                    {currentUser.role === 'user' && (
                      <div className="px-4 py-2 border-b border-white/5 text-sm text-eco-green">
                        Wallet: ${(currentUser.walletBalance || 0).toFixed(2)}
                      </div>
                    )}
                    <div className="border-t border-white/5 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-soft-orange hover:bg-white/5 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
