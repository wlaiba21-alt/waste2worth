import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

/** @param {'login'|'signup'} mode - login: existing users only; signup: create account with role */
export function GoogleAuthButton({ mode = 'signup', role = 'user', onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      toast.error('Google sign-in failed');
      return;
    }
    setLoading(true);
    try {
      const user = await loginWithGoogle(credential, { role, mode });
      toast.success(`Welcome, ${user.name}!`);
      onSuccess?.(user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Google sign-in failed';
      toast.error(msg, { duration: mode === 'login' ? 6000 : 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center items-center">
      <div style={{ width: '100%' }}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={(error) => {
            console.error('Google auth error:', error);
            const message = 
              error?.type === 'network_error' 
                ? 'Check your internet and try again' 
                : 'Google sign-in was cancelled or failed';
            toast.error(message);
          }}
          theme="filled_black"
          size="large"
          text="continue_with"
          shape="rectangular"
          useOneTap={false}
        />
      </div>
    </div>
  );
}
