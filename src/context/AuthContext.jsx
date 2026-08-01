import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const persist = (token, user, profile = null) => {
    localStorage.setItem('waste2worth_token', token);
    localStorage.setItem('waste2worth_user', JSON.stringify(user));
    setCurrentUser(user);
    setVendorProfile(profile);
  };

  useEffect(() => {
    const token = localStorage.getItem('waste2worth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ data }) => {
        setCurrentUser(data.user);
        setVendorProfile(data.vendorProfile);
        localStorage.setItem('waste2worth_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('waste2worth_token');
        localStorage.removeItem('waste2worth_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    persist(data.token, data.user);
    const me = await authApi.me();
    setVendorProfile(me.data.vendorProfile);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await authApi.register(formData);
    persist(data.token, data.user);
    const me = await authApi.me();
    setVendorProfile(me.data.vendorProfile);
    return data.user;
  };

  const loginWithGoogle = async (credential, options = {}) => {
    const { data } = await authApi.googleLogin(credential, options);
    persist(data.token, data.user);
    const me = await authApi.me();
    setVendorProfile(me.data.vendorProfile);
    return data.user;
  };

  const logout = () => {
    setCurrentUser(null);
    setVendorProfile(null);
    localStorage.removeItem('waste2worth_token');
    localStorage.removeItem('waste2worth_user');
  };

  const refreshUser = async () => {
    const { data } = await authApi.me();
    setCurrentUser(data.user);
    setVendorProfile(data.vendorProfile);
    localStorage.setItem('waste2worth_user', JSON.stringify(data.user));
    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, vendorProfile, loading, login, register, loginWithGoogle, logout, refreshUser, setCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
