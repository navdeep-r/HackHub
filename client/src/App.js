import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { 
  Users, 
  Calendar, 
  Eye, 
  UserCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  BarChart3,
  Star,
  Mail,
  User,
  BookOpen,
  Building,
  ExternalLink,
  Bell,
  Filter,
  Search
} from 'lucide-react';

// API Service
import api from './services/api';

// Components
import LoginScreen from './components/LoginScreen';
import FacultyDashboard from './components/FacultyDashboard';
import StudentDashboard from './components/StudentDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FloatingThemeToggle } from './components/ThemeToggle';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                },
              }}
            />
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-twitter-light-50 dark:bg-twitter-dark-900 flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-twitter-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <MainApp /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const MainApp = () => {
  const { user } = useAuth();
  
  if (user?.role === 'faculty') {
    return (
      <>
        <FacultyDashboard />
        <FloatingThemeToggle />
      </>
    );
  } else if (user?.role === 'student') {
    return (
      <>
        <StudentDashboard />
        <FloatingThemeToggle />
      </>
    );
  }
  
  return <Navigate to="/login" />;
};

export default App;
