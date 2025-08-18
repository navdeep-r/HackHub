import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // Prefer express-validator errors
    const valErrors = error.response?.data?.errors;
    let message = error.response?.data?.error;
    if (!message && Array.isArray(valErrors) && valErrors.length > 0) {
      message = valErrors[0].msg || 'Validation failed';
    }
    toast.error(message || 'Something went wrong');

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  storeGoogleTokens: (tokens) => api.post('/auth/google-tokens', tokens),
  devLogin: (payload) => api.post('/auth/dev-login', payload),
};

// Hackathon API
export const hackathonAPI = {
  // Faculty endpoints
  createHackathon: (data) => api.post('/hackathons', data),
  getHackathons: (params) => api.get('/hackathons', { params }),
  getHackathon: (id) => api.get(`/hackathons/${id}`),
  updateHackathon: (id, data) => api.put(`/hackathons/${id}`, data),
  deleteHackathon: (id) => api.delete(`/hackathons/${id}`),
  
  // Student endpoints
  getStudentHackathons: (params) => api.get('/hackathons/student', { params }),
  getStudentHackathon: (id) => api.get(`/hackathons/student/${id}`),
  registerForHackathon: (id, data) => api.post(`/hackathons/${id}/register`, data),
};

// Student API
export const studentAPI = {
  getProfile: () => api.get('/students/profile'),
  updateProfile: (data) => api.put('/students/profile', data),
  getRegistrations: () => api.get('/students/registrations'),
  getViewedHackathons: () => api.get('/students/viewed-hackathons'),
  markAsViewed: (hackathonId) => api.post(`/students/mark-viewed/${hackathonId}`),
  getRegistrationStatus: (hackathonId) => api.get(`/students/registration-status/${hackathonId}`),
  getAnalytics: () => api.get('/students/analytics'),
};

// Analytics API
export const analyticsAPI = {
  getHackathonAnalytics: (id) => api.get(`/analytics/hackathon/${id}`),
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getStudentEngagement: (params) => api.get('/analytics/student-engagement', { params }),
  getTimeSeries: (params) => api.get('/analytics/time-series', { params }),
};

export default api;
