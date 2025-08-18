import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Flag,
  Users,
  MapPin,
  Gift,
  UserCheck,
  ExternalLink,
  X,
  Zap,
  Layers,
  Star,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, hackathonAPI } from '../services/api';

const THEME_ICONS = {
  'AI/ML': <Zap className="inline mr-1 text-cyan-400" size={16} />,
  'Web Dev': <Layers className="inline mr-1 text-purple-400" size={16} />,
  'Blockchain': <Star className="inline mr-1 text-yellow-400" size={16} />,
  'IoT': <Users className="inline mr-1 text-green-400" size={16} />,
  'Cybersecurity': <Flag className="inline mr-1 text-pink-400" size={16} />,
  'Data Science': <Clock className="inline mr-1 text-orange-400" size={16} />,
  'Game Dev': <Star className="inline mr-1 text-indigo-400" size={16} />,
  'Other': <Flag className="inline mr-1 text-gray-400" size={16} />,
};

const PHASES = [
  { label: 'Registration', key: 'registrationDeadline', icon: <Calendar size={18} /> },
  { label: 'Event', key: 'eventDate', icon: <Clock size={18} /> },
];

function getTimeLeft(deadline) {
  const msInMin = 60000;
  const msInHour = 3600000;
  const msInDay = 86400000;

  const now = Date.now();
  const end = new Date(deadline).getTime();
  let diff = end - now;

  if (diff < 0) diff = 0;

  const days = Math.floor(diff / msInDay);
  const hours = Math.floor((diff % msInDay) / msInHour);
  const mins = Math.floor((diff % msInHour) / msInMin);

  return { days, hours, mins, total: diff };
}

const HackathonModal = ({ hackathon, onClose, onSave, onRegistered, mode = 'view' }) => {
  const { user } = useAuth();
  const role = user?.role || 'student';
  const [formData, setFormData] = useState(hackathon || {});
  const [countdown, setCountdown] = useState(getTimeLeft(hackathon?.registrationDeadline));
  const [isRegistered, setIsRegistered] = useState(!!hackathon?.isRegistered);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showRegisteredModal, setShowRegisteredModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('registrationDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Countdown timer effect
  useEffect(() => {
    if (!(mode === 'view' && hackathon?.registrationDeadline)) return undefined;
    const interval = setInterval(() => {
      setCountdown(getTimeLeft(hackathon.registrationDeadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [hackathon, mode]);

  // Load analytics for faculty
  useEffect(() => {
    const loadAnalytics = async () => {
      if (mode !== 'view' || role !== 'faculty' || !hackathon?.id) return;
      try {
        setLoadingAnalytics(true);
        const { data } = await analyticsAPI.getHackathonAnalytics(hackathon.id);
        setAnalytics(data.analytics);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    loadAnalytics();
  }, [mode, role, hackathon?.id]);

  // Student registration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (mode !== 'view' || role !== 'student' || !hackathon?.id) return;
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/students/registration-status/${hackathon.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsRegistered(!!data.isRegistered);
      } catch (error) {
        console.error('Failed to check registration status:', error);
      }
    };
    checkRegistrationStatus();
  }, [mode, role, hackathon?.id]);

  const handleRegisterNow = async () => {
    try {
      await hackathonAPI.registerForHackathon(hackathon.id, { emailUsed: user?.email });
      setIsRegistered(true);
      if (typeof onRegistered === 'function') {
        onRegistered(hackathon.id);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleExportCSV = () => {
    if (!analytics?.registeredStudents) return;
    const rows = analytics.registeredStudents.map((r) => ({
      Name: r.student?.name || '',
      Email: r.student?.email || '',
      Department: r.student?.department || '',
      Year: r.student?.year || '',
      RegistrationDate: r.registrationDate ? new Date(r.registrationDate).toISOString() : '',
      EmailUsed: r.emailUsed || '',
      Status: r.confirmationStatus || '',
    }));
    const headers = Object.keys(rows[0] || {});
    const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(hackathon.title || 'hackathon').replace(/\s+/g, '_')}_registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered and paginated students
  const registeredStudents = useMemo(() => analytics?.registeredStudents || [], [analytics]);
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let filtered = registeredStudents;
    
    if (q) {
      filtered = registeredStudents.filter((r) => {
        const name = (r.student?.name || '').toLowerCase();
        const email = (r.student?.email || '').toLowerCase();
        const dept = (r.student?.department || '').toLowerCase();
        const year = String(r.student?.year || '').toLowerCase();
        return name.includes(q) || email.includes(q) || dept.includes(q) || year.includes(q);
      });
    }

    return filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      let valueA, valueB;

      switch (sortKey) {
        case 'name':
          valueA = a.student?.name || '';
          valueB = b.student?.name || '';
          break;
        case 'email':
          valueA = a.student?.email || '';
          valueB = b.student?.email || '';
          break;
        case 'department':
          valueA = a.student?.department || '';
          valueB = b.student?.department || '';
          break;
        case 'year':
          valueA = a.student?.year || 0;
          valueB = b.student?.year || 0;
          break;
        case 'registrationDate':
          valueA = new Date(a.registrationDate || 0).getTime();
          valueB = new Date(b.registrationDate || 0).getTime();
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return -1 * dir;
      if (valueA > valueB) return 1 * dir;
      return 0;
    });
  }, [registeredStudents, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  if (!hackathon) return null;

  // Progress calculation
  const totalTime = new Date(hackathon.eventDate) - new Date(hackathon.createdAt || hackathon.registrationDeadline);
  const timeGone = Math.max(0, new Date() - new Date(hackathon.createdAt || hackathon.registrationDeadline));
  const progress = Math.min(100, Math.round((timeGone / totalTime) * 100));

  const themes = hackathon.tags || [hackathon.category || 'Other'];

  // EDIT MODE
  if (mode === 'edit') {
    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
      if (onSave) onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Edit Hackathon</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  name="title"
                  value={formData.title || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  placeholder="Enter hackathon title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  placeholder="Enter hackathon description"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Link</label>
                <input
                  name="link"
                  value={formData.link || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  placeholder="https://example.com/register"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category || ''}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  >
                    <option value="AI/ML">AI/ML</option>
                    <option value="Web Dev">Web Dev</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Blockchain">Blockchain</option>
                    <option value="IoT">IoT</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Game Dev">Game Dev</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    name="type"
                    value={formData.type || ''}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration Deadline</label>
                  <input
                    type="date"
                    name="registrationDeadline"
                    value={formData.registrationDeadline || ''}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Date</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate || ''}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // REGISTERED STUDENTS MODAL
  if (showRegisteredModal && role === 'faculty') {
    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Registered Students</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button 
                  onClick={() => setShowRegisteredModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  value={searchQuery} 
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} 
                  placeholder="Search by name, email, department, or year..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
              <div className="text-sm text-gray-600">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
          
          {/* Table */}
          <div className="flex-1 overflow-hidden">
            <div className="overflow-auto h-full">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'email', label: 'Email' },
                      { key: 'department', label: 'Department' },
                      { key: 'year', label: 'Year' },
                      { key: 'registrationDate', label: 'Registration Date' }
                    ].map(({ key, label }) => (
                      <th 
                        key={key} 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => { 
                          if (sortKey === key) {
                            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortKey(key);
                            setSortDir('asc');
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          {sortKey === key && (
                            <span className="text-blue-600">
                              {sortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pagedStudents.map((registration, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {registration.student?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {registration.student?.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {registration.student?.department || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {registration.student?.year ?? '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {registration.registrationDate 
                            ? new Date(registration.registrationDate).toLocaleString() 
                            : '-'
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagedStudents.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-center text-gray-500" colSpan={5}>
                        {searchQuery ? 'No students found matching your search.' : 'No registered students yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} results
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN VIEW MODE
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-6xl h-full max-h-[95vh] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center rounded-2xl opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80')"
          }}
        />
        
        {/* Main Modal */}
        <div className="relative bg-gray-900/95 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col h-full">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors bg-black/20 rounded-full p-2"
          >
            <X size={24} />
          </button>

          {/* Header Section - Fixed Height */}
          <div className="p-4 lg:p-6 border-b border-gray-700 flex-shrink-0">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* Title and Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">
                  {hackathon.title}
                </h1>
                <p className="text-gray-300 text-base lg:text-lg mb-4 leading-relaxed line-clamp-2">
                  {hackathon.description}
                </p>
                 
                {/* Registration Status for Students */}
                {role === 'student' && isRegistered && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-green-500/20 border border-green-500 text-green-400 font-semibold text-sm">
                    <UserCheck size={16} />
                    You are registered
                  </div>
                )}

                {/* Theme Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {themes.map((theme, i) => (
                    <span
                      key={`${theme}-${i}`}
                      className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500 text-blue-400 font-semibold text-xs"
                    >
                      {THEME_ICONS[theme] || <Flag className="inline mr-1" size={14} />}
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Countdown Timer for Students */}
              {role === 'student' && (
                <div className="flex flex-col items-center lg:items-end justify-center bg-black/20 rounded-xl p-4 min-w-[240px] lg:min-w-[280px]">
                  <div className="text-gray-300 text-xs mb-2">Registration Ends In</div>
                  <div className="flex gap-1 lg:gap-2 text-xl lg:text-2xl font-mono font-bold">
                    <div className="flex flex-col items-center">
                      <div className="bg-green-500 text-white px-2 lg:px-3 py-1 lg:py-2 rounded-lg min-w-[50px] lg:min-w-[60px] text-center shadow-lg text-sm lg:text-base">
                        {String(countdown.days).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Days</div>
                    </div>
                    <div className="text-blue-400 flex items-center">:</div>
                    <div className="flex flex-col items-center">
                      <div className="bg-green-500 text-white px-2 lg:px-3 py-1 lg:py-2 rounded-lg min-w-[50px] lg:min-w-[60px] text-center shadow-lg text-sm lg:text-base">
                        {String(countdown.hours).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Hours</div>
                    </div>
                    <div className="text-blue-400 flex items-center">:</div>
                    <div className="flex flex-col items-center">
                      <div className="bg-green-500 text-white px-2 lg:px-3 py-1 lg:py-2 rounded-lg min-w-[50px] lg:min-w-[60px] text-center shadow-lg text-sm lg:text-base">
                        {String(countdown.mins).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Mins</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, 100 - progress)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    {progress < 100 ? `${100 - progress}% time remaining` : 'Event has started!'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Section - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Left Column - Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Full Description */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-700">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">About This Hackathon</h3>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm lg:text-base">
                    {hackathon.description}
                  </p>
                </div>

                {/* Timeline */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-700">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
                    <Clock className="text-blue-400" />
                    Timeline
                  </h3>
                  <div className="space-y-3 lg:space-y-4">
                    {PHASES.map((phase, index) => (
                      <div key={phase.key} className="flex items-center gap-3 lg:gap-4">
                        <div className="flex-shrink-0 w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs lg:text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm lg:text-base">{phase.label}</div>
                          <div className="text-gray-400 text-xs lg:text-sm">
                            {hackathon[phase.key] 
                              ? new Date(hackathon[phase.key]).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'TBA'
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Details */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-700">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">Event Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <MapPin className="text-blue-400 flex-shrink-0" size={18} />
                      <div className="min-w-0">
                        <div className="text-gray-400 text-xs">Location</div>
                        <div className="text-white font-medium truncate text-sm">{hackathon.location || 'Online'}</div>
                      </div>
                    </div>
                     
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Gift className="text-green-400 flex-shrink-0" size={18} />
                      <div className="min-w-0">
                        <div className="text-gray-400 text-xs">Prize Pool</div>
                        <div className="text-white font-medium truncate text-sm">{hackathon.prizePool || 'TBA'}</div>
                      </div>
                    </div>
                     
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Users className="text-purple-400 flex-shrink-0" size={18} />
                      <div className="min-w-0">
                        <div className="text-gray-400 text-xs">Team Size</div>
                        <div className="text-white font-medium truncate text-sm">{hackathon.maxParticipants || 'Flexible'}</div>
                      </div>
                    </div>
                     
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Flag className="text-orange-400 flex-shrink-0" size={18} />
                      <div className="min-w-0">
                        <div className="text-gray-400 text-xs">Type</div>
                        <div className="text-white font-medium capitalize truncate text-sm">{hackathon.type || 'Free'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registration Action for Students */}
                {role === 'student' && !isRegistered && countdown.total > 0 && (
                  <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 backdrop-blur rounded-xl p-4 lg:p-6 border border-blue-500/30">
                    <div className="text-center">
                      <h3 className="text-lg lg:text-xl font-bold text-white mb-2">Ready to Join?</h3>
                      <p className="text-gray-300 mb-4 text-sm lg:text-base">Click below to register for this amazing hackathon!</p>
                      <button
                        onClick={handleRegisterNow}
                        className="inline-flex items-center gap-2 px-6 lg:px-8 py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg text-sm lg:text-base"
                      >
                        <ExternalLink size={18} />
                        Register Now
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Stats & Actions - Fixed Width */}
              <div className="space-y-4 lg:space-y-6">
                {/* Engagement Stats */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-700">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">Engagement</h3>
                  <div className="space-y-3 lg:space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Views</span>
                      <span className="text-white font-bold text-lg lg:text-xl">{hackathon.impressions || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Registrations</span>
                      <span className="text-white font-bold text-lg lg:text-xl">{hackathon.registrations || 0}</span>
                    </div>
                    {hackathon.impressions > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Conversion Rate</span>
                        <span className="text-green-400 font-bold text-sm">
                          {((hackathon.registrations / hackathon.impressions) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* External Link */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-700">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">Official Page</h3>
                  <a
                    href={hackathon.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 w-full justify-center px-3 lg:px-4 py-2 lg:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
                  >
                    <ExternalLink size={16} />
                    Visit Official Site
                  </a>
                </div>

                {/* Faculty Actions */}
                {role === 'faculty' && (
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-700">
                    <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">Faculty Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowRegisteredModal(true)}
                        disabled={loadingAnalytics}
                        className="w-full px-3 lg:px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                      >
                        {loadingAnalytics ? 'Loading...' : 'View Registered Students'}
                      </button>
                      <button
                        onClick={handleExportCSV}
                        disabled={!analytics?.registeredStudents?.length}
                        className="w-full px-3 lg:px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm lg:text-base"
                      >
                        <Download size={16} />
                        Export CSV
                      </button>
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-700">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">Quick Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Category</span>
                      <span className="text-white truncate ml-2">{hackathon.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Type</span>
                      <span className="text-white capitalize truncate ml-2">{hackathon.type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Created</span>
                      <span className="text-white truncate ml-2">
                        {hackathon.createdAt 
                          ? new Date(hackathon.createdAt).toLocaleDateString()
                          : 'Recently'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackathonModal;