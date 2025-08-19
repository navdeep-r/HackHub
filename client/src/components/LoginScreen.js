import React, { useState } from 'react';
import { BookOpen, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = () => {
  const { login, register, loading } = useAuth();
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
          <div className="space-y-6">
            <div className="flex justify-center gap-3 mb-2">
              <button onClick={() => setMode('login')} className={`px-4 py-2 rounded-full text-sm font-semibold ${mode === 'login' ? 'bg-[#00AEEF] text-white' : 'bg-[#111827] text-[#A0AEC0]'}`}>Login</button>
              <button onClick={() => setMode('register')} className={`px-4 py-2 rounded-full text-sm font-semibold ${mode === 'register' ? 'bg-[#20C997] text-white' : 'bg-[#111827] text-[#A0AEC0]'}`}>Register</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm text-[#A0AEC0] mb-1">Role</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRole('student')} className={`flex-1 px-3 py-2 rounded-lg ${role === 'student' ? 'bg-[#7C3AED] text-white' : 'bg-[#111827] text-[#A0AEC0]'}`}>Student</button>
                    <button type="button" onClick={() => setRole('faculty')} className={`flex-1 px-3 py-2 rounded-lg ${role === 'faculty' ? 'bg-[#7C3AED] text-white' : 'bg-[#111827] text-[#A0AEC0]'}`}>Faculty</button>
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-sm text-[#A0AEC0] mb-1">Name</label>
                  <input name="name" value={form.name} onChange={onChange} className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" placeholder="Your Name" />
                </div>
              )}

              <div>
                <label className="block text-sm text-[#A0AEC0] mb-1">Email</label>
                <input name="email" value={form.email} onChange={onChange} type="email" className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-sm text-[#A0AEC0] mb-1">Password</label>
                <input name="password" value={form.password} onChange={onChange} type="password" className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" placeholder="••••••••" />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm text-[#A0AEC0] mb-1">Department</label>
                    <input name="department" value={form.department} onChange={onChange} className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" placeholder="Computer Science" />
                  </div>
                  {role === 'student' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-[#A0AEC0] mb-1">Year (1-4)</label>
                        <input name="year" value={form.year} onChange={onChange} type="number" min="1" max="4" className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#A0AEC0] mb-1">Registration Number</label>
                        <input name="registrationNumber" value={form.registrationNumber} onChange={onChange} className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" placeholder="REG123" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-[#A0AEC0] mb-1">Faculty ID</label>
                      <input name="facultyId" value={form.facultyId} onChange={onChange} className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" placeholder="FAC123" />
                    </div>
                  )}
                </>
              )}

              <button type="submit" disabled={loading} className="w-full group relative overflow-hidden rounded-lg px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]" style={{ background: mode === 'login' ? 'linear-gradient(90deg, #00AEEF 0%, #20C997 100%)' : 'linear-gradient(90deg, #7C3AED 0%, #2563EB 100%)' }}>
                <span className="relative z-10 inline-flex items-center gap-2">{mode === 'login' ? <BookOpen size={20} /> : <User size={20} />} {loading ? 'Please wait…' : (mode === 'login' ? 'Login' : 'Create Account')}</span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
              </button>
            </form>
          </div>
          <div className="mt-6 text-center text-xs text-[#6B7280]">By continuing, you agree to our Terms and Privacy Policy.</div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
