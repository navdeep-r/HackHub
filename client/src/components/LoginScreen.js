import React from 'react';
import { BookOpen, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = () => {
  const { login } = useAuth();

  const handleFacultyLogin = () => {
    login({ dev: true, role: 'faculty', email: 'faculty@college.edu' });
  };

  const handleStudentLogin = () => {
    login({ dev: true, role: 'student', email: 'student@college.edu' });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0D1117] flex items-center justify-center p-6">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30 bg-gradient-to-br from-[#00AEEF] to-[#20C997] animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-30 bg-gradient-to-br from-purple-600 to-indigo-700 animate-pulse" />
      </div>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#1F2937] bg-[rgba(13,17,23,0.9)] backdrop-blur-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-[#00AEEF] via-[#5EEAD4] to-[#20C997] bg-clip-text text-transparent tracking-tight">HackHub</h1>
            <p className="text-[#A0AEC0] mt-2">Centralized Hackathon Management</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleFacultyLogin}
              className="w-full group relative overflow-hidden rounded-lg px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(90deg, #00AEEF 0%, #20C997 100%)' }}
            >
              <span className="relative z-10 inline-flex items-center gap-2"><BookOpen size={20} /> Login as Faculty</span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
            </button>
            <button
              onClick={handleStudentLogin}
              className="w-full group relative overflow-hidden rounded-lg px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(90deg, #7C3AED 0%, #2563EB 100%)' }}
            >
              <span className="relative z-10 inline-flex items-center gap-2"><User size={20} /> Login as Student</span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
            </button>
          </div>
          <div className="mt-6 text-center text-xs text-[#6B7280]">By continuing, you agree to our Terms and Privacy Policy.</div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
