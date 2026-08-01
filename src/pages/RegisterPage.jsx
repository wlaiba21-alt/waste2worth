


import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Recycle, Mail, Lock, User, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { toast } from 'sonner';
import { Logo } from '../components/Logo';

export function RegisterPage() {
  const [role, setRole] = useState('user');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register({ ...formData, role });
      toast.success('Account created successfully!');
      if (role === 'vendor') navigate('/vendor/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
     finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex items-center justify-center pt-24 pb-12 px-4 relative">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-sky-blue/10 blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md z-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create an Account</h1>
          <p className="text-text-light">Join the smart recycling ecosystem.</p>
        </motion.div>

        <div className="glass-card p-8">
          <div className="flex p-1 bg-dark-bg/50 rounded-xl mb-8 border border-white/5">
            <button type="button" onClick={() => setRole('user')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${role === 'user' ? 'bg-white/10 text-white' : 'text-text-light'}`}>
              <User className="w-4 h-4" /> User
            </button>
            <button type="button" onClick={() => setRole('vendor')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${role === 'vendor' ? 'bg-white/10 text-white' : 'text-text-light'}`}>
              <Building2 className="w-4 h-4" /> Vendor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="glass-input w-full" placeholder={role === 'user' ? 'Full Name' : 'Business Name'} />
            <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="glass-input w-full" placeholder="Email" />
            <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="glass-input w-full" placeholder="Password (min 6 chars)" />
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? 'Creating...' : 'Create Account'} <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-text-light">or</span>
            </div>
          </div>

          <GoogleAuthButton
            mode="signup"
            role={role}
            onSuccess={(user) => {
              if (user.role === 'vendor') navigate('/vendor/dashboard');
              else navigate('/dashboard');
            }}
          />
        </div>

        <p className="text-center text-sm text-text-light mt-8">
          Already have an account? <Link to="/login" className="text-eco-green font-medium">Log in</Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
