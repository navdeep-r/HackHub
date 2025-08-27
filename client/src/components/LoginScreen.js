import React, { useState } from 'react';
import { BookOpen, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

const LoginScreen = () => {
  const { login, register, loading } = useAuth();
  const { isDark, colors } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    year: 1,
    registrationNumber: '',
    facultyId: ''
  });

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role,
          department: form.department,
          ...(role === 'student' ? { year: Number(form.year), registrationNumber: form.registrationNumber } : { facultyId: form.facultyId })
        };
        await register(payload);
      }
    } catch (_) {}
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-twitter-light-50 dark:bg-twitter-dark-900 transition-colors duration-300 flex items-center justify-center p-6">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-20 dark:opacity-10 bg-gradient-to-br from-twitter-blue-400 to-twitter-green-400 animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 dark:opacity-10 bg-gradient-to-br from-twitter-purple-500 to-twitter-blue-500 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full blur-3xl opacity-5 bg-gradient-to-br from-twitter-orange-400 to-twitter-yellow-400 animate-pulse" />
      </div>
      
      <div className="w-full max-w-md">
        <div className="card glass-strong border-twitter-light-200 dark:border-twitter-dark-700 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gradient-twitter tracking-tight mb-2">
              HackHub
            </h1>
            <p className="text-twitter-dark-500 dark:text-twitter-dark-300 transition-colors duration-200">
              Centralized Hackathon Management
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex justify-center gap-1 mb-6 p-1 bg-twitter-light-100 dark:bg-twitter-dark-800 rounded-full transition-colors duration-200">
              <button 
                onClick={() => setMode('login')} 
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  mode === 'login' 
                    ? 'bg-gradient-twitter text-white shadow-md' 
                    : 'text-twitter-dark-600 dark:text-twitter-dark-400 hover:text-twitter-blue-500 dark:hover:text-twitter-blue-400'
                }`}
              >
                Login
              </button>
              <button 
                onClick={() => setMode('register')} 
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  mode === 'register' 
                    ? 'bg-gradient-twitter text-white shadow-md' 
                    : 'text-twitter-dark-600 dark:text-twitter-dark-400 hover:text-twitter-blue-500 dark:hover:text-twitter-blue-400'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Selection for Register Mode */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                    Role
                  </label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setRole('student')} 
                      className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                        role === 'student' 
                          ? 'bg-twitter-purple-500 text-white shadow-md' 
                          : 'bg-twitter-light-100 dark:bg-twitter-dark-700 text-twitter-dark-600 dark:text-twitter-dark-400 hover:bg-twitter-light-200 dark:hover:bg-twitter-dark-600'
                      }`}
                    >
                      Student
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setRole('faculty')} 
                      className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                        role === 'faculty' 
                          ? 'bg-twitter-purple-500 text-white shadow-md' 
                          : 'bg-twitter-light-100 dark:bg-twitter-dark-700 text-twitter-dark-600 dark:text-twitter-dark-400 hover:bg-twitter-light-200 dark:hover:bg-twitter-dark-600'
                      }`}
                    >
                      Faculty
                    </button>
                  </div>
                </div>
              )}

              {/* Name Field for Register Mode */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                    Full Name
                  </label>
                  <input 
                    name="name" 
                    value={form.name} 
                    onChange={onChange} 
                    className="input-field" 
                    placeholder="Enter your full name" 
                    required
                  />
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                  Email Address
                </label>
                <input 
                  name="email" 
                  value={form.email} 
                  onChange={onChange} 
                  type="email" 
                  className="input-field" 
                  placeholder="you@example.com" 
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                  Password
                </label>
                <input 
                  name="password" 
                  value={form.password} 
                  onChange={onChange} 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••" 
                  required
                />
              </div>

              {/* Additional Fields for Register Mode */}
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                      Department
                    </label>
                    <input 
                      name="department" 
                      value={form.department} 
                      onChange={onChange} 
                      className="input-field" 
                      placeholder="Computer Science" 
                      required
                    />
                  </div>
                  
                  {role === 'student' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                          Year (1-4)
                        </label>
                        <input 
                          name="year" 
                          value={form.year} 
                          onChange={onChange} 
                          type="number" 
                          min="1" 
                          max="4" 
                          className="input-field" 
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                          Registration Number
                        </label>
                        <input 
                          name="registrationNumber" 
                          value={form.registrationNumber} 
                          onChange={onChange} 
                          className="input-field" 
                          placeholder="REG123" 
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-twitter-dark-700 dark:text-twitter-dark-300 mb-2 transition-colors duration-200">
                        Faculty ID
                      </label>
                      <input 
                        name="facultyId" 
                        value={form.facultyId} 
                        onChange={onChange} 
                        className="input-field" 
                        placeholder="FAC123" 
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading} 
                className={`
                  w-full group relative overflow-hidden rounded-xl px-6 py-4 
                  font-semibold text-white transition-all duration-300 transform
                  ${
                    mode === 'login' 
                      ? 'bg-gradient-twitter hover:bg-gradient-twitter-reverse' 
                      : 'bg-gradient-to-r from-twitter-purple-500 to-twitter-blue-500 hover:from-twitter-purple-600 hover:to-twitter-blue-600'
                  }
                  hover:scale-[1.02] hover:shadow-lg hover:shadow-twitter-blue-200/50 dark:hover:shadow-twitter-blue-500/25
                  focus:outline-none focus:ring-2 focus:ring-twitter-blue-500 focus:ring-offset-2 dark:focus:ring-offset-twitter-dark-800
                  disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                `}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {mode === 'login' ? <BookOpen size={20} /> : <User size={20} />}
                  {loading ? 'Please wait…' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />
              </button>
            </form>
          </div>
          
          {/* Footer */}
          <div className="mt-6 text-center text-xs text-twitter-dark-500 dark:text-twitter-dark-400 transition-colors duration-200">
            By continuing, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
