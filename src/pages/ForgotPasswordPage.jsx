

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/Logo';

export function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleSendCode = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setStep(4);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4 relative">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-soft-orange/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-text-light">We'll help you get back into your account.</p>
        </div>

        <div className="glass-card p-8 overflow-hidden relative min-h-[350px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: EMAIL */}
            {step === 1 &&
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendCode}
              className="flex flex-col gap-5 h-full justify-center">
              
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Enter your email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                    <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input pl-12"
                    placeholder="you@example.com" />
                  
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Send Reset Code <ArrowRight className="w-5 h-5" />
                </button>
                <Link to="/login" className="text-sm text-text-light hover:text-white text-center mt-4 flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </motion.form>
            }

            {/* STEP 2: OTP */}
            {step === 2 &&
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleVerifyOTP}
              className="flex flex-col gap-5 h-full justify-center">
              
                <div className="text-center mb-2">
                  <p className="text-sm text-text-light">We sent a 6-digit code to</p>
                  <p className="font-medium text-white">{email}</p>
                </div>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) =>
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength="1"
                  required
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="w-12 h-14 glass-input text-center text-xl font-bold" />

                )}
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                  Verify Code
                </button>
                <button type="button" onClick={() => setStep(1)} className="text-sm text-text-light hover:text-white text-center mt-2">
                  Didn't receive it? Resend
                </button>
              </motion.form>
            }

            {/* STEP 3: NEW PASSWORD */}
            {step === 3 &&
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleResetPassword}
              className="flex flex-col gap-5 h-full justify-center">
              
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                    <input type="password" required className="w-full glass-input pl-12" placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                    <input type="password" required className="w-full glass-input pl-12" placeholder="••••••••" />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Reset Password
                </button>
              </motion.form>
            }

            {/* STEP 4: SUCCESS */}
            {step === 4 &&
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-8">
              
                <div className="w-16 h-16 bg-eco-green/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-eco-green" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Password Reset!</h3>
                <p className="text-sm text-text-light mb-8">Your password has been successfully updated.</p>
                <Link to="/login" className="btn-primary w-full flex items-center justify-center">
                  Go to Login
                </Link>
              </motion.div>
            }

          </AnimatePresence>
        </div>
      </div>
    </div>);

}