import React from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AIChatbot } from './components/AIChatbot';
import { DashboardLayout } from './components/DashboardLayout';

import { LandingPage } from './pages/LandingPage';
import { VendorsPage } from './pages/VendorsPage';
import { VendorProfilePage } from './pages/VendorProfilePage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';

import { UserOverview } from './pages/user/UserOverview';
import { MyRequests } from './pages/user/MyRequests';
import { MyReturnRequests } from './pages/user/MyReturnRequests';
import { RecyclingHistory } from './pages/user/RecyclingHistory';
import { Orders } from './pages/user/Orders';
import { Addresses } from './pages/user/Addresses';
import { UserReviews } from './pages/user/UserReviews';
import { UserProfile } from './pages/user/UserProfile';
import { WalletPage } from './pages/user/WalletPage';
import { ProductChoicePage } from './pages/user/ProductChoicePage';
import { StoreOrdersPage } from './pages/user/StoreOrdersPage';

import { VendorOverview } from './pages/vendor/VendorOverview';
import { IncomingRequests } from './pages/vendor/IncomingRequests';
import { VendorReturnRequests } from './pages/vendor/VendorReturnRequests';
import { Portfolio } from './pages/vendor/Portfolio';
import { VendorEarnings } from './pages/vendor/VendorEarnings';
import { VendorReviews } from './pages/vendor/VendorReviews';
import { VendorProfile } from './pages/vendor/VendorProfile';
import { VendorOrders } from './pages/vendor/VendorOrders';

import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminVendors } from './pages/admin/AdminVendors';
import { AdminRequests } from './pages/admin/AdminRequests';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminEarnings } from './pages/admin/AdminEarnings';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminRiders } from './pages/admin/AdminRiders';

import { RiderOverview } from './pages/rider/RiderOverview';
import { RiderTasks } from './pages/rider/RiderTasks';
import { RiderProfile } from './pages/rider/RiderProfile';

import { ChatPage } from './pages/ChatPage';
import { AIDetectPage } from './pages/AIDetectPage';
import { StorePage } from './pages/store/StorePage';
import { StoreProductPage } from './pages/store/StoreProductPage';
import { CheckoutPage } from './pages/store/CheckoutPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <motion.div className="min-h-screen flex items-center justify-center bg-dark-bg text-text-light">
        Loading...
      </motion.div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    if (currentUser.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (currentUser.role === 'vendor') return <Navigate to="/vendor/dashboard" replace />;
    if (currentUser.role === 'rider') return <Navigate to="/rider/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const PublicLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-dark-bg relative selection:bg-eco-green/30">
    <motion.div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-eco-green/5 blur-[120px]" />
      <motion.div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-sky-blue/5 blur-[120px]" />
    </motion.div>
    <Navbar />
    <main className="flex-grow z-10">{children}</main>
    <Footer />
    <AIChatbot />
  </div>
);

const StoreLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-dark-bg">
    <Navbar />
    <main className="flex-grow z-10 container mx-auto px-6 lg:px-12 py-24">{children}</main>
    <Footer />
  </div>
);

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" theme="dark" richColors />
        <Routes>
          <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/vendors" element={<PublicLayout><VendorsPage /></PublicLayout>} />
          <Route path="/vendors/:id" element={<PublicLayout><VendorProfilePage /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
          <Route path="/forgot-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />

          <Route path="/store" element={<StoreLayout><StorePage /></StoreLayout>} />
          <Route path="/store/:id" element={<StoreLayout><StoreProductPage /></StoreLayout>} />
          <Route
            path="/store/:id/checkout"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <StoreLayout><CheckoutPage /></StoreLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<UserOverview />} />
            <Route path="requests" element={<MyRequests />} />
            <Route path="return-requests" element={<MyReturnRequests />} />
            <Route path="product-choice" element={<ProductChoicePage />} />
            <Route path="product-choice/:productId" element={<ProductChoicePage />} />
            <Route path="history" element={<RecyclingHistory />} />
            <Route path="orders" element={<Orders />} />
            <Route path="store-orders" element={<StoreOrdersPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="reviews" element={<UserReviews />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>

          <Route path="/vendor/dashboard" element={<ProtectedRoute allowedRoles={['vendor']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<VendorOverview />} />
            <Route path="requests" element={<IncomingRequests />} />
            <Route path="return-requests" element={<VendorReturnRequests />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="orders" element={<VendorOrders />} />
            <Route path="orders/:orderId" element={<VendorOrders />} />
            <Route path="earnings" element={<VendorEarnings />} />
            <Route path="reviews" element={<VendorReviews />} />
            <Route path="profile" element={<VendorProfile />} />
          </Route>

          <Route path="/rider/dashboard" element={<ProtectedRoute allowedRoles={['rider']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<RiderOverview />} />
            <Route path="tasks" element={<RiderTasks />} />
            <Route path="profile" element={<RiderProfile />} />
          </Route>

          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="riders" element={<AdminRiders />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="earnings" element={<AdminEarnings />} />
          </Route>

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:threadId" element={<ChatPage />} />
            <Route path="/ai-detect" element={<AIDetectPage />} />
            <Route path="/dashboard/store-orders" element={<StoreOrdersPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
