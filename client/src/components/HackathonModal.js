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
  AlertCircle,
  Loader2,
  TrendingUp,
  Award,
  Timer
} from 'lucide-react';

const THEME_ICONS = {
  'AI/ML': <Zap className="inline" size={14} />,
  'Web Dev': <Layers className="inline" size={14} />,
  'Blockchain': <Star className="inline" size={14} />,
  'IoT': <Users className="inline" size={14} />,
  'Cybersecurity': <Flag className="inline" size={14} />,
  'Data Science': <Clock className="inline" size={14} />,
  'Game Dev': <Star className="inline" size={14} />,
  'Other': <Flag className="inline" size={14} />,
};

const CATEGORIES = [
  'AI/ML', 'Web Dev', 'Mobile App', 'Blockchain', 'IoT',
  'Cybersecurity', 'Data Science', 'Game Dev', 'Other'
];

const PLATFORMS = [
  'Unstop', 'DoraHacks', 'HackerEarth', 'Devpost', 'Government', 'Others'
];

// Utility functions
const getTimeLeft = (deadline) => {
  if (!deadline) return { days: 0, hours: 0, mins: 0, secs: 0, total: 0 };

  const msInSec = 1000;
  const msInMin = 60000;
  const msInHour = 3600000;
  const msInDay = 86400000;

  const now = Date.now();
  const end = new Date(deadline).getTime();
  let diff = Math.max(0, end - now);

  const days = Math.floor(diff / msInDay);
  const hours = Math.floor((diff % msInDay) / msInHour);
  const mins = Math.floor((diff % msInHour) / msInMin);
  const secs = Math.floor((diff % msInMin) / msInSec);

  return { days, hours, mins, secs, total: diff };
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBA';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const getMonitorStorageKey = (hackathonId) => `monitor:${hackathonId}`;

// Countdown Timer Component
const CountdownTimer = ({ deadline, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    if (!deadline) return;

    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  const isUrgent = timeLeft.total > 0 && timeLeft.total < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isExpired = timeLeft.total === 0;

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div className={`absolute inset-0 ${isExpired ? 'bg-muted' : isUrgent ? 'bg-gradient-to-br from-warning/10 to-destructive/10' : 'bg-gradient-primary opacity-10'}`} />

      <div className="relative p-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Timer className={isExpired ? 'text-muted-foreground' : 'text-primary'} size={20} />
          <h3 className="text-sm font-medium text-foreground">
            {isExpired ? 'Registration Closed' : 'Time Remaining'}
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Mins', value: timeLeft.mins },
            { label: 'Secs', value: timeLeft.secs }
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className={`text-2xl font-bold ${isExpired ? 'text-muted-foreground' : 'text-foreground'}`}>
                {String(value).padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        {isUrgent && !isExpired && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
              <AlertCircle size={12} />
              Hurry! Less than 24 hours left
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Registration Status Component — updated styling to match modal theme
const RegistrationStatus = ({
  isRegistered,
  confirmedRegistration,
  registrationFailed,
  pendingMonitor,
  monitoringTimeLeft,
  onRegister,
  registering,
  isDeadlinePassed
}) => {
  // Deadline passed
  if (isDeadlinePassed) {
    return (
      <div className="p-6 border border-white/10 rounded-xl bg-white/5">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <AlertCircle size={20} />
          <span className="font-medium">Registration Closed</span>
        </div>
      </div>
    );
  }

  // Confirmed registration (success)
  if (confirmedRegistration && isRegistered) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-white/5 border border-white/8">
        <div className="relative p-6 text-center">
          <CheckCircle className="mx-auto mb-3 text-emerald-400" size={32} />
          <h3 className="font-semibold text-foreground mb-1">Registration Confirmed</h3>
          <p className="text-sm text-muted-foreground">You're all set for this hackathon!</p>
        </div>
      </div>
    );
  }

  // pending monitor (checking)
  if (pendingMonitor) {
    const minutes = Math.floor(monitoringTimeLeft / 60);
    const seconds = monitoringTimeLeft % 60;

    return (
      <div className="p-6 border border-white/10 rounded-xl bg-white/5">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 text-primary animate-spin" size={32} />
          <h3 className="font-semibold text-foreground mb-2">Confirming Registration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Checking your email for confirmation...
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/6 rounded-lg">
            <Clock size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // registration failed
  if (registrationFailed) {
    return (
      <div className="p-6 border border-destructive/30 rounded-xl bg-destructive/5">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 text-destructive" size={32} />
          <h3 className="font-semibold text-foreground mb-1">Confirmation Not Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please check your email and try again
          </p>
          <button
            onClick={onRegister}
            disabled={registering}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // default: show register button
  return (
    <button
      onClick={onRegister}
      disabled={registering || isRegistered}
      className={`w-full p-6 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] ${
        isRegistered
          ? 'bg-emerald-500 text-white cursor-default'
          : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:shadow-lg'
      }`}
    >
      {registering ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          Registering...
        </span>
      ) : isRegistered ? (
        <span className="flex items-center justify-center gap-2">
          <CheckCircle size={20} />
          Registered ✓
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <UserPlus size={20} />
          Register Now
        </span>
      )}
    </button>
  );
};

// Main Component
const HackathonModal = ({
  hackathon,
  onClose,
  onSave,
  onRegistered,
  onUnregistered,
  mode = 'view',
  user,
  analyticsAPI,
  hackathonAPI,
  studentAPI,
  toast
}) => {
  const role = user?.role || 'student';

  const normalizeToForm = (h = {}) => ({
    id: h.id || h._id || undefined,
    title: h.title || '',
    description: h.description || '',
    link: h.competitionLink || h.link || '',
    category: (h.tags && h.tags[0]) || h.category || 'Other',
    type: (h.competitionType === 'unpaid' ? 'free' : (h.competitionType || h.type || 'free')),
    registrationDeadline: h.registrationDeadline ? new Date(h.registrationDeadline).toISOString() : '',
    eventDate: h.eventDate ? new Date(h.eventDate).toISOString() : '',
    prizePool: h.prizePool || '',
    platform: h.platform || '',
    teamSizeMin: h.teamSizeMin || h.teamSizeMin === 0 ? h.teamSizeMin : '',
    teamSizeMax: h.teamSizeMax || h.teamSizeMax === 0 ? h.teamSizeMax : '',
    maxParticipants: h.maxParticipants || '',
    requirements: h.requirements || ''
  });

  const [formData, setFormData] = useState(() => normalizeToForm(hackathon || {}));
  const [isRegistered, setIsRegistered] = useState(Boolean(hackathon?.isRegistered));
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [registering, setRegistering] = useState(false);
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

  useEffect(() => {
    setFormData(normalizeToForm(hackathon || {}));
  }, [hackathon]);

  // Re-hydrate monitoring state
  useEffect(() => {
    if (!hackathon?.id) return;
    const key = getMonitorStorageKey(hackathon.id);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.startedAt && Date.now() - saved.startedAt < 5 * 60 * 1000) {
        setPendingMonitor(true);
        if (typeof saved.remainingSec === 'number') {
          const remain = Math.max(0, saved.remainingSec - Math.floor((Date.now() - saved.savedAt) / 1000));
          setMonitoringTimeLeft(remain);
        }
      } else {
        localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }, [hackathon?.id]);

  // Load analytics
  useEffect(() => {
    const loadAnalytics = async () => {
      if (mode !== 'view' || role !== 'faculty' || !hackathon?.id || !analyticsAPI) return;

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
  }, [mode, role, hackathon?.id, analyticsAPI]);

  // Check registration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (mode !== 'view' || role !== 'student' || !hackathon?.id || !studentAPI || pendingMonitor) return;

      try {
        const res = await studentAPI.getRegistrationStatus(hackathon.id);
        const status = res?.data?.registration?.confirmationStatus;

        if (!pendingMonitor) {
          setIsRegistered(Boolean(res?.data?.isRegistered));
          setConfirmedRegistration(prev => (status === 'confirmed' ? true : prev));
          setRegistrationFailed(prev => (status === 'failed' ? true : prev));
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
      }
    };

    checkRegistrationStatus();
  }, [mode, role, hackathon?.id, pendingMonitor, studentAPI]);

  // Poll for confirmation
  useEffect(() => {
    if (role !== 'student' || !pendingMonitor || !hackathon?.id || !studentAPI) return;

    let cancelled = false;
    let attempts = 0;
    let pollInterval = null;
    const maxAttempts = 10;
    const totalTime = 5 * 60;
    setMonitoringTimeLeft(totalTime);

    const countdownInterval = setInterval(() => {
      if (cancelled) return;
      setMonitoringTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) return 0;
        try {
          const key = getMonitorStorageKey(hackathon.id);
          localStorage.setItem(key, JSON.stringify({
            startedAt: Date.now() - (300 - newTime) * 1000,
            savedAt: Date.now(),
            remainingSec: newTime
          }));
        } catch { /* ignore */ }
        return newTime;
      });
    }, 1000);

    const checkStatus = async () => {
      if (cancelled) return;
      attempts += 1;

      try {
        const res = await studentAPI.getRegistrationStatus(hackathon.id);
        const status = res?.data?.registration?.confirmationStatus;

        if (status === 'confirmed' && !cancelled) {
          setPendingMonitor(false);
          setConfirmedRegistration(true);
          setIsRegistered(true);
          setRegistrationFailed(false);
          setMonitoringTimeLeft(0);
          if (toast) toast.success('Registration confirmed via email.');
          if (onRegistered) onRegistered(hackathon.id);
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(countdownInterval);
          try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
          return;
        } else if (attempts >= maxAttempts && !cancelled) {
          setPendingMonitor(false);
          setRegistrationFailed(true);
          setMonitoringTimeLeft(0);
          if (toast) toast.error('Registration confirmation not found within 5 minutes.');
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(countdownInterval);
          try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
          return;
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts >= 3 && !cancelled) {
          setPendingMonitor(false);
          setRegistrationFailed(true);
          setMonitoringTimeLeft(0);
          if (toast) toast.error('Failed to verify registration.');
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(countdownInterval);
          try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
        }
      }
    };

    const initialTimeout = setTimeout(() => {
      if (!cancelled) {
        checkStatus();
        pollInterval = setInterval(checkStatus, 30000);
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(countdownInterval);
      setMonitoringTimeLeft(0);
      try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch {}
    };
  }, [role, pendingMonitor, hackathon?.id, onRegistered, studentAPI, toast]);

  const handleRegisterNow = useCallback(async () => {
    if (!hackathon?.id || !user?.email || !hackathonAPI) return;

    let toastId;
    if (toast) toastId = toast.loading('Submitting registration...');

    try {
      setRegistering(true);
      setRegistrationFailed(false);
      setMonitoringTimeLeft(0);

      // Immediately set registered in UI for better UX (ensures button changes right away)
      setIsRegistered(true);

      // show pending monitor state to wait for confirmation
      setPendingMonitor(true);

      try {
        const key = getMonitorStorageKey(hackathon.id);
        localStorage.setItem(key, JSON.stringify({
          startedAt: Date.now(),
          savedAt: Date.now(),
          remainingSec: 300
        }));
      } catch { /* ignore */ }

      const res = await hackathonAPI.registerForHackathon(hackathon.id, { emailUsed: user.email });

      // Fire the rocket animation briefly to celebrate registration
      try {
        setLaunchRocket(true);
        setTimeout(() => setLaunchRocket(false), 1400);
      } catch (e) { /* ignore animation errors */ }

      if (toast) toast.success('Registration submitted — checking for confirmation.', { id: toastId });

      // If API returns confirmation immediately, mark confirmed
      if (res?.data?.registration?.confirmationStatus === 'confirmed') {
        setConfirmedRegistration(true);
      }
    } catch (error) {
      if (toast && toastId) toast.dismiss(toastId);
      console.error('Registration failed:', error);
      const errorMessage = error?.response?.data?.error || 'Registration failed. Please try again.';
      if (toast) toast.error(errorMessage);
      setPendingMonitor(false);
      setRegistrationFailed(true);
      // revert optimistic UI if needed
      setIsRegistered(false);
      try { localStorage.removeItem(getMonitorStorageKey(hackathon.id)); } catch { /* ignore */ }
    } finally {
      setRegistering(false);
    }
  }, [hackathon?.id, user?.email, hackathonAPI, toast]);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;

    if (name === 'registrationDeadline' || name === 'eventDate') {
      if (!value) {
        setFormData(prev => ({ ...prev, [name]: '' }));
        return;
      }
      const iso = new Date(value).toISOString();
      setFormData(prev => ({ ...prev, [name]: iso }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.title?.trim()) {
      setError('Title is required');
      return;
    }

    const payload = {
      id: formData.id,
      title: formData.title?.trim(),
      description: formData.description?.trim() || undefined,
      link: formData.link?.trim() || undefined,
      category: formData.category || undefined,
      type: formData.type || undefined,
      registrationDeadline: formData.registrationDeadline || undefined,
      eventDate: formData.eventDate || undefined,
      prizePool: formData.prizePool || undefined,
      platform: formData.platform || undefined,
      teamSizeMin: formData.teamSizeMin ? Number(formData.teamSizeMin) : undefined,
      teamSizeMax: formData.teamSizeMax ? Number(formData.teamSizeMax) : undefined,
      maxParticipants: formData.maxParticipants ? Number(formData.maxParticipants) : undefined,
      requirements: formData.requirements || undefined
    };

    setError(null);
    onSave?.(payload);
  }, [formData, onSave]);

  const handleExportCSV = useCallback(() => {
    if (!analytics?.registeredStudents?.length) {
      if (toast) toast.error('No data to export');
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

    if (toast) toast.success('CSV exported successfully');
  }, [analytics?.registeredStudents, hackathon?.title, toast]);

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

  const themes = useMemo(() => {
    return hackathon?.tags || [hackathon?.category || 'Other'];
  }, [hackathon?.tags, hackathon?.category]);

  const isDeadlinePassed = useMemo(() => {
    if (!hackathon?.registrationDeadline) return false;
    return new Date(hackathon.registrationDeadline).getTime() <= Date.now();
  }, [hackathon?.registrationDeadline]);

  // overall progress from registrationDeadline -> eventDate
  const progress = useMemo(() => {
    if (!hackathon?.eventDate || !hackathon?.registrationDeadline) return 0;
    const start = new Date(hackathon.registrationDeadline).getTime();
    const end = new Date(hackathon.eventDate).getTime();
    const total = Math.max(1, end - start);
    const elapsed = Math.max(0, Date.now() - start);
    return Math.min(100, Math.round((elapsed / total) * 100));
  }, [hackathon?.eventDate, hackathon?.registrationDeadline]);

  // animatedProgress drives the circular SVG animation smoothly
  const [animatedProgress, setAnimatedProgress] = useState(progress);
  useEffect(() => {
    let rafId = null;
    // use rAF to schedule the animation frame so transitions apply
    rafId = requestAnimationFrame(() => setAnimatedProgress(progress));
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [progress]);

  // rocket launch state triggers a short celebratory animation when registration succeeds
  const [launchRocket, setLaunchRocket] = useState(false);

  // unified modal card class so both modes share the same theme
  const modalCardClass = 'rounded-[20px] bg-hackmodal backdrop-blur-md shadow-2xl overflow-hidden border border-white/30';

  // --- EDIT MODE (now visually unified with view) ---
  if (mode === 'edit') { return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh]">
        <div className={modalCardClass}>
          {/* shared style block for rocket animation, etc */}
          <style>{`
            /* Rocket animation styles (used in both modes) */
            .rocket-container { position: absolute; right: 12px; top: -28px; pointer-events: none; }
            .rocket { width: 64px; height: 64px; transform-origin: center; opacity: 0; }
            @keyframes rocketUp {
              0% { transform: translateY(0) translateX(0) scale(0.9) rotate(-8deg); opacity: 0; }
              10% { opacity: 1; }
              50% { transform: translateY(-120px) translateX(-18px) scale(1.05) rotate(6deg); opacity: 1; }
              100% { transform: translateY(-220px) translateX(-32px) scale(0.8) rotate(12deg); opacity: 0; }
            }
            .rocket-launch { animation: rocketUp 1.2s cubic-bezier(.2,.9,.3,1) forwards; }
          `}</style>

          {/* Gradient Header (same style as view) */}
          <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/10 via-white/5 to-transparent mix-blend-overlay" />
            <div className="relative p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Award className="text-white" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white leading-tight mb-1">Edit Hackathon</h2>
                  <div className="text-sm text-white/80">Make changes and save</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-2 rounded-md text-white/90 hover:text-white hover:shadow-[0_6px_20px_rgba(99,102,241,0.18)] transition-all"
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
          </div>

          {/* Body: two-column layout */}
          <div className="p-6 bg-transparent max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="text-destructive flex-shrink-0" size={20} />
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl bg-white/5 border border-white/8 p-6">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="title"
                    value={formData.title || ''}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground shadow-sm transition-all"
                    placeholder="Enter hackathon title"
                  />

                  <label className="block text-sm font-semibold text-foreground mb-2 mt-4">Description</label>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground transition-all resize-none shadow-sm"
                    rows={5}
                    placeholder="Describe the hackathon..."
                  />
                </div>

                <div className="rounded-xl bg-white/5 border border-white/8 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Registration Link</label>
                    <input
                      name="link"
                      type="url"
                      value={formData.link || ''}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground transition-all shadow-sm"
                      placeholder="https://example.com/register"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
                    <select
                      name="category"
                      value={formData.category || ''}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground transition-all shadow-sm"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/8 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Registration Deadline</label>
                    <input
                      type="date"
                      name="registrationDeadline"
                      value={formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString().slice(0, 10) : ''}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Event Date</label>
                    <input
                      type="date"
                      name="eventDate"
                      value={formData.eventDate ? new Date(formData.eventDate).toISOString().slice(0, 10) : ''}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/8 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Prize Pool</label>
                    <input
                      name="prizePool"
                      type="text"
                      value={formData.prizePool || ''}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground transition-all shadow-sm"
                      placeholder="e.g. $10,000 or ₹50,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Platform</label>
                    <select
                      name="platform"
                      value={formData.platform || ''}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-white/8 rounded-xl focus:ring-0 bg-white/6 text-foreground transition-all shadow-sm"
                    >
                      <option value="">Select Platform</option>
                      {PLATFORMS.map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Sidebar area (save/cancel + themes preview) */}
              <aside className="space-y-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/8 shadow-sm">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {themes.map((t) => (
                      <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }}>
                        {THEME_ICONS[t] || THEME_ICONS['Other']} {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/8 shadow-sm">
                  <div className="mb-4">
                    <div className="text-sm text-gray-400">Registration Deadline</div>
                    <div className="font-semibold text-foreground">{formatDate(hackathon.registrationDeadline)}</div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 border border-white/8 rounded-lg bg-transparent text-foreground hover:bg-white/6 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90 transition-opacity"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  ); }

  // --- VIEW MODE (unified look) ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl max-h-[90vh]">
        <div className={modalCardClass}>
          {/* shared style block for rocket animation */}
          <style>{`
            .rocket-container { position: absolute; left: 50%; transform: translateX(-50%); pointer-events: none; z-index: 40; }
            .rocket { width: 64px; height: 64px; transform-origin: center; opacity: 0; }
            @keyframes rocketUp {
              0% { transform: translateY(0) translateX(0) scale(0.9) rotate(-8deg); opacity: 0; }
              10% { opacity: 1; }
              50% { transform: translateY(-120px) translateX(12px) scale(1.05) rotate(6deg); opacity: 1; }
              100% { transform: translateY(-240px) translateX(28px) scale(0.8) rotate(12deg); opacity: 0; }
            }
            .rocket-launch { animation: rocketUp 1.2s cubic-bezier(.2,.9,.3,1) forwards; }
          `}</style>

          {/* Gradient Header */}
          <div className="relative">
            <div className="h-36 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/10 via-white/5 to-transparent mix-blend-overlay" />
              <div className="relative p-8 flex items-start justify-between">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                    <Award className="text-white" size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white leading-tight mb-1">{hackathon.title || 'Untitled Hackathon'}</h2>
                    <div className="text-sm text-white/80">
                      {hackathon.category || 'General'} • {hackathon.type === 'free' ? 'Free' : 'Paid'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {hackathon.link && (
                    <a
                      href={hackathon.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-full border border-white/60 text-white text-sm font-semibold hover:shadow-[0_8px_30px_rgba(59,130,246,0.18)] transition-all mr-2"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <ExternalLink size={14} />
                        Visit
                      </span>
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-md text-white/90 hover:text-white hover:shadow-[0_6px_20px_rgba(99,102,241,0.18)] transition-all"
                    aria-label="Close"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 bg-transparent">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl bg-white/5 shadow-sm border border-white/8 p-6">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3"><Layers size={18} className="text-indigo-500" /> About this Hackathon</h3>
                  <p className="text-gray-300 leading-relaxed">{hackathon.description || 'No description provided.'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/8 flex items-center gap-4">
                    <div className="p-3 bg-white/6 rounded-lg shadow-sm">
                      <Calendar className="text-sky-400" size={20} />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Registration Deadline</div>
                      <div className="font-semibold text-foreground">{formatDate(hackathon.registrationDeadline)}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5 border border-white/8 flex items-center gap-4">
                    <div className="p-3 bg-white/6 rounded-lg shadow-sm">
                      <Clock className="text-violet-400" size={20} />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Event Date</div>
                      <div className="font-semibold text-foreground">{formatDate(hackathon.eventDate)}</div>
                    </div>
                  </div>
                </div>

                {/* Registered Students */}
                {role === 'faculty' && (
                  <div className="rounded-xl bg-white/5 border border-white/8 shadow-sm overflow-hidden">
                    <div className="sticky top-0 bg-white/6 backdrop-blur-sm p-4 border-b border-white/8 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserCheck className="text-indigo-400" size={18} />
                        <div>
                          <div className="text-sm font-semibold text-foreground">Registered Students</div>
                          <div className="text-xs text-gray-400">{analytics?.registrationStats?.total || 0} total</div>
                        </div>
                      </div>

                      {filteredStudents.length > 0 && (
                        <button onClick={handleExportCSV} className="px-3 py-1 text-sm bg-white border border-white/8 rounded-md hover:shadow-sm">Export CSV</button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {loadingAnalytics && (
                        <div className="p-6 text-center"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
                      )}

                      {!loadingAnalytics && filteredStudents.length === 0 && (
                        <div className="p-6 text-center text-gray-400">No registrations yet.</div>
                      )}

                      {!loadingAnalytics && filteredStudents.length > 0 && (
                        <div className="divide-y">
                          {pagedStudents.map((r, idx) => (
                            <div key={r._id || r.registrationId} className={`${idx % 2 === 0 ? 'bg-white/6' : 'bg-white/3'} p-4 flex items-center justify-between` }>
                              <div>
                                <div className="font-medium text-foreground">{r.student?.name || 'Unknown'}</div>
                                <div className="text-sm text-gray-400">{r.student?.email || ''}</div>
                              </div>
                              <div className="text-sm text-gray-400 text-right">
                                <div>{new Date(r.registrationDate || 0).toLocaleDateString()}</div>
                                <div className="text-xs">{new Date(r.registrationDate || 0).toLocaleTimeString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {totalPages > 1 && (
                      <div className="p-3 flex items-center justify-between border-t border-white/8">
                        <div className="text-sm text-gray-400">Page {currentPage} of {totalPages}</div>
                        <div className="flex gap-2">
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-md text-sm">Prev</button>
                          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-md text-sm">Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Sidebar */}
              <aside className="space-y-6">
                {/* Themes */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/8 shadow-sm">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {themes.map((t) => (
                      <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }}>
                        {THEME_ICONS[t] || THEME_ICONS['Other']} {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Countdown + Circular Progress */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/8 shadow-sm flex flex-col items-center gap-4">
                  <div className="relative w-36 h-36">
                    <svg viewBox="0 0 36 36" className="w-36 h-36">
                      <defs>
                        <linearGradient id="g1" x1="0%" x2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <path d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#17233A" strokeWidth="3" />
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="url(#g1)"
                        strokeWidth="3"
                        strokeDasharray={`${animatedProgress} ${100 - animatedProgress}`}
                        style={{ transition: 'stroke-dasharray 900ms ease' }}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xl font-semibold text-foreground">{Math.round(animatedProgress)}%</div>
                        <div className="text-xs text-gray-400">progress</div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full text-center">
                    <div className="text-sm text-gray-400">Time until registration ends</div>
                    <div className="text-lg font-semibold text-foreground mt-1">{getTimeLeft(hackathon.registrationDeadline).days}d {getTimeLeft(hackathon.registrationDeadline).hours}h</div>
                  </div>
                </div>

                {/* Register / Status area — uses unified RegistrationStatus component */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/8 shadow-sm relative">
                  {role === 'student' ? (
                    <div className="space-y-3">
                      <RegistrationStatus
                        isRegistered={isRegistered}
                        confirmedRegistration={confirmedRegistration}
                        registrationFailed={registrationFailed}
                        pendingMonitor={pendingMonitor}
                        monitoringTimeLeft={monitoringTimeLeft}
                        onRegister={handleRegisterNow}
                        registering={registering}
                        isDeadlinePassed={isDeadlinePassed}
                      />

                      {confirmedRegistration && <div className="text-sm text-emerald-400">Registration confirmed</div>}
                      {registrationFailed && <div className="text-sm text-red-400">Registration not confirmed</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 text-center">Faculty tools available above</div>
                  )}

                  {/* Rocket element shown briefly on successful registration */}
                  {launchRocket && (
                    <div className="rocket-container" aria-hidden>
                      <svg className={`rocket rocket-launch`} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img">
                        <g fill="none" fillRule="evenodd">
                          <path d="M32 6c-6 0-12 6-14 12-6 0-12 6-12 12 0 6 6 12 12 12 6 0 12 6 14 12 2-6 8-12 14-12 6 0 12-6 12-12 0-6-6-12-12-12-6-6-8-12-14-12z" fill="#fff" opacity="0"/>
                          <path d="M46 18c-2-6-14-10-14-10s-8 8-10 14c-8 0-12 6-12 12 0 6 6 12 12 12 6 0 12 6 12 6s8-8 14-14c6-6 6-12 6-12s-6-2-8-8z" fill="#E11D48" />
                          <path d="M20 44c2 2 8 4 8 4s2-6 4-8c-4-2-8-4-12-2-2 2-2 4 0 6z" fill="#FFBA08" />
                        </g>
                      </svg>
                    </div>
                  )}

                  {/* Dev-only test button to verify rocket animation without API call */}
                  {(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) && (
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => {
                          try {
                            console.log('Dev: launching rocket test');
                            setLaunchRocket(true);
                            setTimeout(() => setLaunchRocket(false), 1400);
                          } catch (e) { console.error(e); }
                        }}
                        className="px-3 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 hover:bg-indigo-100"
                      >
                        Test Rocket
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackathonModal;
