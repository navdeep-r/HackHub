import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Validate API base URL
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

if (!isValidUrl(API_BASE_URL)) {
  console.error('Invalid API_BASE_URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Optional: Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout - please try again');
      } else if (error.message === 'Network Error') {
        toast.error('Network error - please check your connection');
      } else {
        toast.error('Unable to connect to server');
      }
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const endpoint = error.config?.url;
    
    // Handle different HTTP status codes
    switch (status) {
      case 401:
        // Don't auto-clear tokens for login endpoint failures
        if (!endpoint?.includes('/auth/login')) {
          // Unauthorized - clear auth and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            toast.error('Session expired. Please log in again.');
            window.location.href = '/login';
          }
        }
        break;
        
      case 403:
        toast.error('Access denied - insufficient permissions');
        break;
        
      case 404:
        toast.error('Resource not found');
        break;
        
      case 422:
        // Validation errors - prefer express-validator format
        const valErrors = data?.errors;
        if (Array.isArray(valErrors) && valErrors.length > 0) {
          const firstError = valErrors[0];
          const message = firstError?.msg || firstError?.message || 'Validation failed';
          toast.error(message);
        } else {
          toast.error(data?.message || data?.error || 'Validation failed');
        }
        break;
        
      case 429:
        toast.error('Too many requests - please wait before trying again');
        break;
        
      case 500:
        // For login endpoints, show more specific error
        if (endpoint?.includes('/auth/login')) {
          const loginError = data?.details || data?.error || 'Login failed - server error';
          toast.error(loginError);
        } else {
          toast.error('Server error - please try again later');
        }
        break;
        
      case 503:
        toast.error('Service temporarily unavailable');
        break;
        
      default:
        // Generic error handling
        let message = data?.error || data?.message;
        
        // Fallback to express-validator errors if no primary message
        if (!message) {
          const valErrors = data?.errors;
          if (Array.isArray(valErrors) && valErrors.length > 0) {
            message = valErrors[0]?.msg || valErrors[0]?.message || 'Validation failed';
          }
        }
        
        toast.error(message || `Request failed with status ${status}`);
    }

    return Promise.reject(error);
  }
);

// Auth API with better error handling and validation
export const authAPI = {
  register: (userData) => {
    if (!userData || !userData.email || !userData.password) {
      return Promise.reject(new Error('Email and password are required'));
    }
    return api.post('/auth/register', userData);
  },
  
  login: (credentials) => {
    if (!credentials || !credentials.email || !credentials.password) {
      return Promise.reject(new Error('Email and password are required'));
    }
    return api.post('/auth/login', credentials);
  },
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (data) => {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('Invalid profile data'));
    }
    return api.put('/auth/profile', data);
  },
  
  storeGoogleTokens: (tokens) => {
    if (!tokens) {
      return Promise.reject(new Error('Tokens are required'));
    }
    return api.post('/auth/google-tokens', tokens);
  },
  
  devLogin: (payload) => {
    if (!payload || !payload.role || !payload.email) {
      return Promise.reject(new Error('Role and email are required for dev login'));
    }
    return api.post('/auth/dev-login', payload);
  },
};

// Hackathon API with validation
export const hackathonAPI = {
  // Faculty endpoints
  createHackathon: (data) => {
    if (!data || !data.title) {
      return Promise.reject(new Error('Hackathon title is required'));
    }
    return api.post('/hackathons', data);
  },
  
  getHackathons: (params = {}) => api.get('/hackathons', { params }),
  
  getHackathon: (id) => {
    if (!id) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.get(`/hackathons/${id}`);
  },
  
  updateHackathon: (id, data) => {
    if (!id) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('Update data is required'));
    }
    return api.put(`/hackathons/${id}`, data);
  },
  
  deleteHackathon: (id) => {
    if (!id) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.delete(`/hackathons/${id}`);
  },
  
  // Student endpoints
  getStudentHackathons: (params = {}) => api.get('/hackathons/student', { params }),
  
  getStudentHackathon: (id) => {
    if (!id) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.get(`/hackathons/student/${id}`);
  },
  
  registerForHackathon: (id, data = {}) => {
    if (!id) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.post(`/hackathons/${id}/register`, data);
  },
  
  unregisterFromHackathon: (id) => {
    if (!id) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.post(`/hackathons/${id}/unregister`);
  },
};

// Student API with validation
export const studentAPI = {
  getProfile: () => api.get('/students/profile'),
  
  updateProfile: (data) => {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('Profile data is required'));
    }
    return api.put('/students/profile', data);
  },
  
  getRegistrations: () => api.get('/students/registrations'),
  getViewedHackathons: () => api.get('/students/viewed-hackathons'),
  
  markAsViewed: (hackathonId) => {
    if (!hackathonId) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.post(`/students/mark-viewed/${hackathonId}`);
  },
  
  getRegistrationStatus: (hackathonId) => {
    if (!hackathonId) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.get(`/students/registration-status/${hackathonId}`);
  },
  
  getAnalytics: () => api.get('/students/analytics'),
};

// Analytics API with validation
export const analyticsAPI = {
  getHackathonAnalytics: (id) => {
    if (!id) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.get(`/analytics/hackathon/${id}`);
  },
  
  getOverview: (params = {}) => api.get('/analytics/overview', { params }),
  getStudentEngagement: (params = {}) => api.get('/analytics/student-engagement', { params }),
  getTimeSeries: (params = {}) => api.get('/analytics/time-series', { params }),
};

// Registration API with validation
export const registrationAPI = {
  registerForHackathon: (hackathonId, data = {}) => {
    if (!hackathonId) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.post(`/registrations/start`, { hackathonId, ...data });
  },
  
  getRegistrationStatus: (hackathonId) => {
    if (!hackathonId) {
      return Promise.reject(new Error('Hackathon ID is required'));
    }
    return api.get(`/registrations/${hackathonId}/status`);
  },
};

// Utility functions for common operations
export const apiUtils = {
  // Helper to check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },
  
  // Helper to get current user from localStorage
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },
  
  // Helper to clear auth data
  clearAuthData: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  // Helper to validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Helper to validate password strength (basic)
  isValidPassword: (password) => {
    return password && password.length >= 6;
  }
};

export default api;