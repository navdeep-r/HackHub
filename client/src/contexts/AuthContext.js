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

// Dev login API wrapper with better error handling
const devLogin = async ({ role, email }) => {
  try {
    const response = await authAPI.devLogin({ role, email });
    const { data } = response;
    
    if (!data || !data.token || !data.user) {
      throw new Error('Invalid response from dev login API');
    }
    
    return { token: data.token, user: data.user };
  } catch (error) {
    console.error('Dev login error:', error);
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start with true for initial load
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Validate stored user data
            if (parsedUser && typeof parsedUser === 'object') {
              setUser(parsedUser);
            } else {
              // Clear invalid data
              localStorage.removeItem('user');
              localStorage.removeItem('token');
            }
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    if (!credentials) {
      toast.error('Invalid credentials provided');
      throw new Error('Invalid credentials provided');
    }

    setLoading(true);
    try {
      let token, user;
      
      if (credentials?.dev === true) {
        if (!credentials.role || !credentials.email) {
          throw new Error('Role and email are required for dev login');
        }
        ({ token, user } = await devLogin(credentials));
      } else {
        if (!credentials.email || !credentials.password) {
          throw new Error('Email and password are required');
        }
        const response = await authAPI.login(credentials);
        
        if (!response?.data) {
          throw new Error('Invalid response from login API');
        }
        
        ({ token, user } = response.data);
      }

      if (!token || !user) {
        throw new Error('Invalid response: missing token or user data');
      }

      // Validate user object
      if (!user.id && !user._id) {
        throw new Error('Invalid user data: missing user ID');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Login successful!');
      return user;
    } catch (error) {
      console.error('Login error:', error);
      const message = error?.response?.data?.message || error?.message || 'Login failed!';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    if (!userData || !userData.email || !userData.password) {
      toast.error('Email and password are required');
      throw new Error('Email and password are required');
    }

    setLoading(true);
    try {
      const response = await authAPI.register(userData);
      
      if (!response?.data) {
        throw new Error('Invalid response from registration API');
      }
      
      const { token, user: createdUser } = response.data;
      
      if (!token || !createdUser) {
        throw new Error('Invalid response: missing token or user data');
      }

      // Validate user object
      if (!createdUser.id && !createdUser._id) {
        throw new Error('Invalid user data: missing user ID');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(createdUser));
      setUser(createdUser);
      toast.success('Registration successful!');
      return createdUser;
    } catch (error) {
      console.error('Registration error:', error);
      const message = error?.response?.data?.message || error?.message || 'Registration failed!';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if localStorage fails
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    if (!user) {
      toast.error('No user logged in');
      throw new Error('No user logged in');
    }

    if (!data || typeof data !== 'object') {
      toast.error('Invalid profile data');
      throw new Error('Invalid profile data');
    }

    setLoading(true);
    try {
      // If you have a real API endpoint for profile updates, use it here
      const response = await authAPI.updateProfile(data);
      const updatedUser = response?.data?.user || { ...user, ...data };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Fallback to local update if API fails (as in original code)
      try {
        const updatedUser = { ...user, ...data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        toast.success('Profile updated locally!');
        return updatedUser;
      } catch (localError) {
        console.error('Local profile update error:', localError);
        const message = error?.response?.data?.message || error?.message || 'Profile update failed!';
        toast.error(message);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const storeGoogleTokens = async (tokens) => {
    if (!tokens) {
      toast.error('Invalid tokens provided');
      throw new Error('Invalid tokens provided');
    }

    setLoading(true);
    try {
      await authAPI.storeGoogleTokens(tokens);
      toast.success('Google authentication configured successfully!');
    } catch (error) {
      console.error('Google tokens storage error:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to store Google tokens';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    isInitialized,
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