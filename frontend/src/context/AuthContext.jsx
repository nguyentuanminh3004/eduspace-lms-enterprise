import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('eduspace_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncMe = async () => {
      const token = localStorage.getItem('eduspace_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        const profile = data.user || data;
        setUser(profile);
        localStorage.setItem('eduspace_user', JSON.stringify(profile));
      } catch {
        localStorage.removeItem('eduspace_token');
        localStorage.removeItem('eduspace_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    syncMe();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('eduspace_token', data.token);
    const userData = data.user || {
      _id: data._id,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      department: data.department,
      studentCode: data.studentCode,
      avatar: data.avatar,
      mustChangePassword: data.mustChangePassword,
    };
    localStorage.setItem('eduspace_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const updateUserState = (updatedFields) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem('eduspace_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('eduspace_token');
    localStorage.removeItem('eduspace_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
