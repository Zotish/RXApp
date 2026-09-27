/* =============================================
   VEDA - Auth Context Provider
   ============================================= */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AGE_GROUP_KEY = 'veda_age_group';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('veda_token')));

  useEffect(() => {
    const token = localStorage.getItem('veda_token');
    if (token) {
      authAPI.getProfile()
        .then(data => {
          setUser(data.user);
          if (data.user?.age_group) localStorage.setItem(AGE_GROUP_KEY, data.user.age_group);
        })
        .catch(() => {
          localStorage.removeItem('veda_token');
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    localStorage.setItem('veda_token', data.token);
    if (data.user?.age_group) localStorage.setItem(AGE_GROUP_KEY, data.user.age_group);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authAPI.register(userData);
    localStorage.setItem('veda_token', data.token);
    if (data.user?.age_group) localStorage.setItem(AGE_GROUP_KEY, data.user.age_group);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('veda_token');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const setAgeGroup = async (group) => {
    localStorage.setItem(AGE_GROUP_KEY, group);
    if (user) {
      try {
        const data = await authAPI.setAgeGroup(group);
        setUser(prev => ({ ...prev, age_group: data.user.age_group }));
      } catch { /* Keep the local age group when offline. */ }
    }
  };

  const getAgeGroup = () => {
    if (user?.age_group) return user.age_group;
    return localStorage.getItem(AGE_GROUP_KEY) || null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, setAgeGroup, getAgeGroup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
