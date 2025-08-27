import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Flag,
  Users,
  MapPin,
  Gift,
  UserCheck,
  UserPlus,
  ExternalLink,
  X,
  Zap,
  Layers,
  Star,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, hackathonAPI, studentAPI } from '../services/api';
import toast from 'react-hot-toast';

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

const CATEGORIES = [
  'AI/ML', 'Web Dev', 'Mobile App', 'Blockchain', 'IoT', 
  'Cybersecurity', 'Data Science', 'Game Dev', 'Other'
];

const PLATFORMS = [
  'Unstop', 'DoraHacks', 'HackerEarth', 'Devpost', 'Government', 'Others'
];

// Utility functions
const getTimeLeft = (deadline) => {
  if (!deadline) return { days: 0, hours: 0, mins: 0, total: 0 };
  
  const msInMin = 60000;
  const msInHour = 3600000;
  const msInDay = 86400000;

  const now = Date.now();
  const end = new Date(deadline).getTime();
  let diff = Math.max(0, end - now);

  const days = Math.floor(diff / msInDay);
  const hours = Math.floor((diff % msInDay) / msInHour);
  const mins = Math.floor((diff % msInHour) / msInMin);

  return { days, hours, mins, total: diff };
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBA';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

// Persist monitoring state to survive re-mounts for up to 5 minutes
const getMonitorStorageKey = (hackathonId) => `monitor:${hackathonId}`;

// Main Component
const HackathonModal = ({ 
  hackathon, 
  onClose, 
  onSave, 
  onRegistered,
  onUnregistered,
  mode = 'view' 
}) => {
  const { user } = useAuth();
  const role = user?.role || 'student';
  
  // State management
  const [formData, setFormData] = useState(() => hackathon || {});
  const [countdown, setCountdown] = useState(() => getTimeLeft(hackathon?.registrationDeadline));
  const [isRegistered, setIsRegistered] = useState(Boolean(hackathon?.isRegistered));
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showRegisteredModal, setShowRegisteredModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [gmailLinked, setGmailLinked] = useState(false);
  const [gmailAuthUrl, setGmailAuthUrl] = useState(null);
  const [pendingMonitor, setPendingMonitor] = useState(false);
  const [confirmedRegistration, setConfirmedRegistration] = useState(false);
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const [monitoringTimeLeft, setMonitoringTimeLeft] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('registrationDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const pageSize = 10;

  // Debug state changes
  useEffect(() => {
    console.log('🔍 State Change:', {
      registering,
      pendingMonitor,
      isRegistered,
      confirmedRegistration,
      registrationFailed,
      monitoringTimeLeft
    });
  }, [registering, pendingMonitor, isRegistered, confirmedRegistration, registrationFailed, monitoringTimeLeft]);

  // Re-hydrate monitoring state from localStorage so UI doesn't flicker back
  useEffect(() => {
    if (!hackathon?.id) return;
    const key = getMonitorStorageKey(hackathon.id);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw);
      // consider it valid if within last 5 min
      if (saved?.startedAt && Date.now() - saved.startedAt < 5 * 60 * 1000) {
        setPendingMonitor(true);
        // approximate remaining time if available
        if (typeof saved.remainingSec === 'number') {
          const remain = Math.max(0, saved.remainingSec - Math.floor((Date.now() - saved.savedAt) / 1000));
          setMonitoringTimeLeft(remain);
        }
      } else {
        localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }, [hackathon?.id]);

  // Countdown timer effect
  useEffect(() => {
    if (mode !== 'view' || !hackathon?.registrationDeadline) return;
    
    const interval = setInterval(() => {
      setCountdown(getTimeLeft(hackathon.registrationDeadline));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [hackathon?.registrationDeadline, mode]);

  // Load analytics for faculty
  useEffect(() => {
    const loadAnalytics = async () => {
      if (mode !== 'view' || role !== 'faculty' || !hackathon?.id) return;
      
      try {
        setLoadingAnalytics(true);
        setError(null);
        const { data } = await analyticsAPI.getHackathonAnalytics(hackathon.id);
        setAnalytics(data.analytics);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setError('Failed to load analytics data');
      } finally {
        setLoadingAnalytics(false);
      }
    };
    
    loadAnalytics();
  }, [mode, role, hackathon?.id]);

  // Student registration status check
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (mode !== 'view' || role !== 'student' || !hackathon?.id) return;
      
      // DON'T interfere with active monitoring process
      if (pendingMonitor) {
        console.log('Skipping status check - monitoring in progress');
        return;
      }
      // If a fresh local monitor window exists, don't override UI yet
      try {
        const raw = localStorage.getItem(getMonitorStorageKey(hackathon.id));
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.startedAt && Date.now() - saved.startedAt < 5 * 60 * 1000) {
            console.log('Skipping status check - local monitor window active');
            return;
          }
        }
      } catch {}
      
      try {
        const res = await studentAPI.getRegistrationStatus(hackathon.id);
        const status = res?.data?.registration?.confirmationStatus;
        
        // Only update states if we're not currently monitoring
        if (!pendingMonitor) {
          setIsRegistered(Boolean(res?.data?.isRegistered));
          // Do not clear local flags unless backend explicitly reports them
          setConfirmedRegistration(prev => (status === 'confirmed' ? true : prev));
          setRegistrationFailed(prev => (status === 'failed' ? true : prev));
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
      }
    };
    
    checkRegistrationStatus();
  }, [mode, role, hackathon?.id, pendingMonitor]); // Added pendingMonitor dependency

  // Poll for confirmation status when monitoring
  useEffect(() => {
    if (role !== 'student' || !pendingMonitor || !hackathon?.id) {
      console.log('🔵 Polling useEffect skipped - role:', role, 'pendingMonitor:', pendingMonitor, 'hackathonId:', hackathon?.id);
      return;
    }
    
    console.log('🟢 Starting polling for confirmation - hackathon:', hackathon.id);
    
    let cancelled = false;
    let attempts = 0;
    let pollInterval = null;
    const maxAttempts = 10; // 5 minutes at 30s interval
    const totalTime = 5 * 60; // 5 minutes in seconds
    setMonitoringTimeLeft(totalTime);
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setMonitoringTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          clearInterval(countdownInterval);
          return 0;
        }
        // persist remaining seconds occasionally
        try {
          const key = getMonitorStorageKey(hackathon.id);
          localStorage.setItem(key, JSON.stringify({ startedAt: Date.now() - (300 - newTime) * 1000, savedAt: Date.now(), remainingSec: newTime }));
        } catch { /* ignore */ }
        return newTime;
      });
    }, 1000);
    
    // Function to check status
    const checkStatus = async () => {
      if (cancelled) return;
      
      attempts += 1;
      console.log(`🟡 Polling attempt ${attempts}/${maxAttempts} for hackathon ${hackathon.id}`);
      
      try {
        const res = await studentAPI.getRegistrationStatus(hackathon.id);
        const status = res?.data?.registration?.confirmationStatus;
        console.log('🟡 Polling response:', { status, isRegistered: res?.data?.isRegistered, cancelled });
        
        if (status === 'confirmed' && !cancelled) {
          console.log('🟢 Registration confirmed! Stopping monitoring...');
          setPendingMonitor(false);
          setConfirmedRegistration(true);
          setIsRegistered(true);
          setRegistrationFailed(false);
          setMonitoringTimeLeft(0);
          toast.success('Registration confirmed via email.');
          if (onRegistered) onRegistered(hackathon.id);
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(countdownInterval);
          try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
          return;
        } else if (status === 'failed' && !cancelled && attempts >= 3) {
          // Only fail after at least 3 attempts (1.5 minutes)
          console.log('🔴 Registration failed - confirmation not found after multiple attempts');
          setPendingMonitor(false);
          setRegistrationFailed(true);
          setMonitoringTimeLeft(0);
          toast.error('Confirmation email not found after multiple checks.');
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(countdownInterval);
          try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
          return;
        } else if (attempts >= maxAttempts && !cancelled) {
          console.log('🔴 Registration timeout - max attempts reached');
          setPendingMonitor(false);
          setRegistrationFailed(true);
          setMonitoringTimeLeft(0);
          toast.error('Registration confirmation not found within 5 minutes. Please check your email manually or try again.');
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(countdownInterval);
          try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
          return;
        }
      } catch (error) {
        console.error('🔴 Polling error:', error);
        // Only fail on repeated errors, not just one
        if (attempts >= 3 && !cancelled) {
          setPendingMonitor(false);
          setRegistrationFailed(true);
          setMonitoringTimeLeft(0);
          toast.error('Failed to verify registration after multiple attempts. Please try again.');
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(countdownInterval);
          try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
          return;
        }
      }
    };
    
    // Wait 15 seconds before first check to give backend time to start monitoring
    const initialTimeout = setTimeout(() => {
      if (!cancelled) {
        checkStatus(); // First check
        // Then check every 30 seconds
        pollInterval = setInterval(checkStatus, 30000);
      }
    }, 15000); // Initial delay of 15 seconds
    
    return () => {
      console.log('🔴 Cleaning up polling intervals');
      cancelled = true;
      clearTimeout(initialTimeout);
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(countdownInterval);
      setMonitoringTimeLeft(0);
  try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
    };
  }, [role, pendingMonitor, hackathon?.id]);

  // Event handlers
  const handleRegisterNow = useCallback(async () => {
    if (!hackathon?.id || !user?.email) return;

    // show immediate feedback
    const toastId = toast.loading('Wait — registration submitted. Waiting until confirmed (up to 5 minutes)...');

    try {
      console.log('🟡 Starting registration process...');
      setRegistering(true);
      setRegistrationFailed(false);
      setMonitoringTimeLeft(0);
      // Optimistically mark monitoring active to avoid races with status checks
      setPendingMonitor(true);
      try {
        const key = getMonitorStorageKey(hackathon.id);
        localStorage.setItem(key, JSON.stringify({ startedAt: Date.now(), savedAt: Date.now(), remainingSec: 300 }));
      } catch { /* ignore storage errors */ }

      const { data } = await hackathonAPI.registerForHackathon(hackathon.id, {
        emailUsed: user.email,
      });

      console.log('🟡 Registration API call successful, response:', data);

      setGmailLinked(Boolean(data.gmailLinked));
      setGmailAuthUrl(data.gmailAuthUrl || null);

  // monitoring already set active above; this log confirms
  console.log('🟡 Monitoring active - polling effect should start...');

      // replace loading with a nicer message
      toast.success('Registration submitted — checking for confirmation.', { id: toastId });

      // if they need to link Gmail, open the auth url but keep monitoring active
      if (!data.gmailLinked && data.gmailAuthUrl) {
        toast('Please link your Gmail to enable automatic confirmation checks.', { icon: '📧' });
        window.open(data.gmailAuthUrl, '_blank', 'noopener,noreferrer');
      }
      // do NOT mark isRegistered until we get explicit confirmation
      console.log('🟡 Registration process complete, monitoring should now be active');
    } catch (error) {
      toast.dismiss(toastId); // clear loading toast if any
      console.error('🔴 Registration failed:', error);
      const errorMessage = error?.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(errorMessage);
      // ensure monitor is turned off on error
      setPendingMonitor(false);
      setRegistrationFailed(true);
      try {
        const key = getMonitorStorageKey(hackathon.id);
        localStorage.removeItem(key);
      } catch { /* ignore */ }
    } finally {
      console.log('🟡 Setting registering to false');
      setRegistering(false);
    }
  }, [hackathon?.id, user?.email]);

  
     
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.title?.trim()) {
      setError('Title is required');
      return;
    }
    onSave?.(formData);
  }, [formData, onSave]);

  const handleExportCSV = useCallback(() => {
    if (!analytics?.registeredStudents?.length) {
      toast.error('No data to export');
      return;
    }

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
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(hackathon.title || 'hackathon').replace(/\s+/g, '_')}_registrations.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  }, [analytics?.registeredStudents, hackathon.title]);

  const handleSort = useCallback((key) => {
    setSortDir(current => sortKey === key ? (current === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  // Memoized computations
  const registeredStudents = useMemo(() => analytics?.registeredStudents || [], [analytics]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = registeredStudents;

    if (query) {
      filtered = registeredStudents.filter((r) => {
        const searchFields = [
          r.student?.name,
          r.student?.email,
          r.student?.department,
          String(r.student?.year)
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchFields.includes(query);
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
          valueA = Number(a.student?.year) || 0;
          valueB = Number(b.student?.year) || 0;
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
  }, [filteredStudents, currentPage, pageSize]);

  const themes = useMemo(() => {
    return hackathon?.tags || [hackathon?.category || 'Other'];
  }, [hackathon?.tags, hackathon?.category]);

 const progress = useMemo(() => {
  if (!hackathon?.eventDate || !hackathon?.registrationDeadline) return 0;

  const start = new Date(hackathon.registrationDeadline).getTime();
  const end = new Date(hackathon.eventDate).getTime();
  const totalTime = end - start;
  if (totalTime <= 0) return 0;

  const timeGone = Math.max(0, Date.now() - start);
  return Math.min(100, Math.round((timeGone / totalTime) * 100));
}, [hackathon?.eventDate, hackathon?.registrationDeadline]);

  const isDeadlinePassed = useMemo(() => {
    return countdown.total <= 0;
  }, [countdown.total]);

  // Early returns for invalid states
  if (!hackathon) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-white rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Hackathon Data</h2>
          <p className="text-gray-600 mb-4">Unable to load hackathon information.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Edit Mode Component
  if (mode === 'edit') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Edit Hackathon</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  value={formData.title || ''}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  placeholder="Enter hackathon title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  placeholder="Enter hackathon description"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Link</label>
                <input
                  name="link"
                  type="url"
                  value={formData.link || ''}
                  onChange={handleFormChange}
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
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    name="type"
                    value={formData.type || ''}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration Deadline (Date Only)</label>
                  <input
                    type="date"
                    name="registrationDeadline"
                    value={formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString().slice(0, 10) : ''}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Date (Date Only)</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate ? new Date(formData.eventDate).toISOString().slice(0, 10) : ''}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prize Pool</label>
                  <input
                    name="prizePool"
                    type="text"
                    value={formData.prizePool || ''}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                    placeholder="e.g. $10,000 or ₹50,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <select
                    name="platform"
                    value={formData.platform || ''}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                  >
                    <option value="">Select Platform</option>
                    {PLATFORMS.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Team Size</label>
                  <input
                    name="teamSizeMin"
                    type="number"
                    min="1"
                    value={formData.teamSizeMin || ''}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                    placeholder="e.g. 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Team Size</label>
                  <input
                    name="teamSizeMax"
                    type="number"
                    min="1"
                    value={formData.teamSizeMax || ''}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                    placeholder="e.g. 4"
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

  // Registered Students Modal
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
                  disabled={!analytics?.registeredStudents?.length}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowRegisteredModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
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
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name, email, department, or year..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-gray-600">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
              </div>
            </div>

            {loadingAnalytics && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading analytics...</span>
              </div>
            )}
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
                        onClick={() => handleSort(key)}
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
                    <tr key={`${registration.student?.email || 'student'}-${idx}`} className="hover:bg-gray-50 transition-colors">
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
                  {pagedStudents.length === 0 && !loadingAnalytics && (
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

  // Main View Mode
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
            aria-label="Close modal"
          >
            <X size={24} />
          </button>

          {/* Header Section */}
          <div className="p-4 lg:p-6 border-b border-gray-700 flex-shrink-0">
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

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
                {role === 'student' && (isRegistered || pendingMonitor) && (
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full font-semibold text-sm mb-3 ${
                    pendingMonitor 
                      ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                      : confirmedRegistration
                        ? 'bg-green-500/20 border border-green-500 text-green-400'
                        : 'bg-blue-500/20 border border-blue-500 text-blue-400'
                  }`}>
                    {pendingMonitor ? (
                      <>
                        <Clock size={16} className="animate-spin" />
                        Checking confirmation...
                      </>
                    ) : confirmedRegistration ? (
                      <>
                        <CheckCircle size={16} />
                        Registration confirmed
                      </>
                    ) : isRegistered ? (
                      <>
                        <UserCheck size={16} />
                        You are registered
                      </>
                    ) : null}
                  </div>
                )}

                {/* Theme Tags */}
                <div className="flex flex-wrap gap-2">
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
              {role === 'student' && countdown.total > 0 && (
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

              {/* Faculty Analytics Summary */}
              {role === 'faculty' && (
                <div className="flex flex-col items-center lg:items-end justify-center bg-black/20 rounded-xl p-4 min-w-[240px] lg:min-w-[280px]">
                  <div className="text-gray-300 text-xs mb-2">Analytics</div>
                  {loadingAnalytics ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                      <span className="text-sm text-gray-400">Loading...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {analytics?.registeredStudents?.length || 0}
                      </div>
                      <div className="text-sm text-gray-400 mb-3">Registered Students</div>
                      <button
                        onClick={() => setShowRegisteredModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  )}
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
                  
                  {/* Description Card */}
                  <div className="bg-white/10 rounded-lg p-4 mb-4 border border-gray-600">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm lg:text-base">
                      {hackathon.description || 'No description available.'}
                    </p>
                  </div>

                  {/* Key Details Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Card */}
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="text-blue-400" size={18} />
                        <span className="text-blue-400 font-semibold text-sm">Location</span>
                      </div>
                      <p className="text-white font-medium">{hackathon.location || 'Online'}</p>
                    </div>

                    {/* Prize Pool Card */}
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="text-green-400" size={18} />
                        <span className="text-green-400 font-semibold text-sm">Prize Pool</span>
                      </div>
                      <p className="text-white font-medium">{hackathon.prizePool || 'TBA'}</p>
                    </div>

                    {/* Team Size Card */}
                    <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="text-purple-400" size={18} />
                        <span className="text-purple-400 font-semibold text-sm">Team Size</span>
                      </div>
                      <p className="text-white font-medium">
                        {hackathon.teamSizeMin && hackathon.teamSizeMax 
                          ? `${hackathon.teamSizeMin}-${hackathon.teamSizeMax} members`
                          : hackathon.teamSizeMin 
                            ? `Min ${hackathon.teamSizeMin} members`
                            : hackathon.teamSizeMax 
                              ? `Max ${hackathon.teamSizeMax} members`
                              : hackathon.maxParticipants || 'Flexible'
                        }
                      </p>
                    </div>

                    {/* Platform Card */}
                    {hackathon.platform && (
                      <div className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="text-indigo-400" size={18} />
                          <span className="text-indigo-400 font-semibold text-sm">Platform</span>
                        </div>
                        <p className="text-white font-medium">{hackathon.platform}</p>
                      </div>
                    )}

                    {/* Type Card */}
                    <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag className="text-orange-400" size={18} />
                        <span className="text-orange-400 font-semibold text-sm">Type</span>
                      </div>
                      <p className="text-white font-medium capitalize">{hackathon.type || 'Free'}</p>
                    </div>

                    {/* Category Card */}
                    <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="text-cyan-400" size={18} />
                        <span className="text-cyan-400 font-semibold text-sm">Category</span>
                      </div>
                      <p className="text-white font-medium">{hackathon.category || 'General'}</p>
                    </div>

                    {/* Organizer Card */}
                    {hackathon.organizer && (
                      <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck className="text-yellow-400" size={18} />
                          <span className="text-yellow-400 font-semibold text-sm">Organizer</span>
                        </div>
                        <p className="text-white font-medium">{hackathon.organizer}</p>
                      </div>
                    )}
                  </div>
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
                            {formatDate(hackathon[phase.key])}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registration Actions for Students */}
                        {role === 'student' && countdown.total > 0 && (
                          <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 backdrop-blur rounded-xl p-4 lg:p-6 border border-blue-500/30">
                          <div className="text-center">
                            <h3 className="text-lg lg:text-xl font-bold text-white mb-2">Ready to Join?</h3>
                            <p className="text-gray-300 mb-4 text-sm lg:text-base">
                            {isRegistered 
                              ? 'You are already registered for this hackathon!' 
                              : 'Click below to register for this amazing hackathon!'
                            }
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!isRegistered && !registrationFailed && !pendingMonitor ? (
                              <button
                              onClick={handleRegisterNow}
                              disabled={registering || isDeadlinePassed}
                              className="inline-flex items-center justify-center gap-2 px-6 lg:px-8 py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg text-sm lg:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                              {registering ? (
                                <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Registering...
                                </>
                              ) : (
                                <>
                                <UserPlus size={18} />
                                Register Now
                                </>
                              )}
                              </button>
                            ) : pendingMonitor ? (
                              <button
                                disabled
                                className="inline-flex items-center justify-center gap-2 px-6 lg:px-8 py-2 lg:py-3 bg-amber-600 text-white font-bold rounded-lg text-sm lg:text-base uppercase cursor-not-allowed"
                                aria-live="polite"
                                aria-label="Checking registration confirmation"
                              >
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                CHECKING...
                              </button>

                            ) : registrationFailed ? (
                              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                <AlertCircle className="text-red-500" size={20} />
                                <span className="text-red-500 font-semibold">Registration Failed</span>
                                </div>
                                <p className="text-gray-400 text-sm mb-3">
                                Confirmation not found within 5 minutes. Please check your email or try again.
                                </p>
                              </div>
                              <button
                                onClick={handleRegisterNow}
                                disabled={registering}
                                className="inline-flex items-center justify-center gap-2 px-6 lg:px-8 py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg text-sm lg:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <UserPlus size={18} />
                                Try Again
                              </button>
                              </div>
                            ) : confirmedRegistration ? (
                              <button
                                onClick={() => window.open(hackathon.link, '_blank', 'noopener,noreferrer')}
                                className="inline-flex items-center justify-center gap-2 px-6 lg:px-8 py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg text-sm lg:text-base"
                              >
                                <ExternalLink size={18} />
                                Visit Site
                              </button>
                            ) : isRegistered ? (
                              <button
                                onClick={() => window.open(hackathon.link, '_blank', 'noopener,noreferrer')}
                                className="inline-flex items-center justify-center gap-2 px-6 lg:px-8 py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg text-sm lg:text-base"
                              >
                                <ExternalLink size={18} />
                                Visit Site
                              </button>
                            ) : null}
                            </div>

                            {/* Pending monitor status */}
                      {pendingMonitor && (
                        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                            <span className="text-blue-300 font-semibold">Checking for confirmation...</span>
                          </div>
                          <p className="text-blue-200 text-sm">
                            🕐 Time remaining: {Math.floor(monitoringTimeLeft / 60)}:{(monitoringTimeLeft % 60).toString().padStart(2, '0')} minutes
                          </p>
                        </div>
                      )}

                      {/* Gmail linking message */}
                      {isRegistered && !gmailLinked && gmailAuthUrl && (
                        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-lg">
                          <p className="text-yellow-300 text-sm">
                            📧 Link your Gmail to enable automatic confirmation tracking.
                          </p>
                          <button
                            onClick={() => window.open(gmailAuthUrl, '_blank', 'noopener,noreferrer')}
                            className="mt-2 text-yellow-400 hover:text-yellow-300 underline text-sm"
                          >
                            Link Gmail Account
                          </button>
                        </div>
                      )}

                      {/* Pending confirmation message */}
                      {isRegistered && pendingMonitor && (
                        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500 rounded-lg">
                          <p className="text-blue-300 text-sm">
                            ⏳ Monitoring your email for registration confirmation...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Registration status for expired deadline */}
                {role === 'student' && countdown.total <= 0 && (
                  <div className="bg-gradient-to-r from-gray-600/20 to-gray-500/20 backdrop-blur rounded-xl p-4 lg:p-6 border border-gray-500/30 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Clock className="text-gray-400" size={20} />
                      <h3 className="text-lg font-bold text-gray-300">Registration Period Ended</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      The registration deadline has passed, but you can still visit the hackathon page for updates.
                    </p>
                    {hackathon.link && (
                      <button
                        onClick={() => window.open(hackathon.link, '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <ExternalLink size={18} />
                        Visit Hackathon Page
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                {hackathon.link && (
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-gray-700">
                    <h4 className="text-white font-bold mb-3">Quick Actions</h4>
                    <button
                      onClick={() => window.open(hackathon.link, '_blank', 'noopener,noreferrer')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <ExternalLink size={18} />
                      Visit Official Site
                    </button>
                  </div>
                )}

                {/* Additional Info */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-gray-700">
                  <h4 className="text-white font-bold mb-3">Additional Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white">
                        {hackathon.createdAt ? new Date(hackathon.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Updated:</span>
                      <span className="text-white">
                        {hackathon.updatedAt ? new Date(hackathon.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {hackathon.organizer && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Organizer:</span>
                        <span className="text-white">{hackathon.organizer}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Help & Support */}
                <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-gray-700">
                  <h4 className="text-white font-bold mb-3">Need Help?</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      Having issues with registration or have questions about the hackathon?
                    </p>
                    <button className="text-blue-400 hover:text-blue-300 transition-colors">
                      Contact Support
                    </button>
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