import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Dev login API wrapper
const devLogin = async ({ role, email }) => {
  const { data } = await authAPI.devLogin({ role, email });
  return { token: data.token, user: data.user };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Optionally, load user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      let token, user;
      if (credentials?.dev === true) {
        ({ token, user } = await devLogin(credentials));
      } else {
        const response = await authAPI.login(credentials);
        ({ token, user } = response.data);
      }
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Login successful!');
      return user;
    } catch (error) {
      toast.error('Login failed!');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    // You can implement a mock register if needed
    toast.success('Registration successful!');
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data) => {
    // Mock update
    const updatedUser = { ...user, ...data };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    toast.success('Profile updated successfully!');
    return updatedUser;
  };

  const storeGoogleTokens = async (tokens) => {
    toast.success('Google authentication configured successfully!');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    storeGoogleTokens,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
