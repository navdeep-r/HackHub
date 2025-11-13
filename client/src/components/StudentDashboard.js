import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ExternalLink, Calendar, Eye, UserCheck, 
  BarChart3, Flame, BookOpen, Layers, Zap, Star, Bell, CheckCircle, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import HackathonModal from './HackathonModal';
import Countdown from './Countdown';
import ThemeToggle from './ThemeToggle';
import { hackathonAPI, studentAPI, registrationAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  'AI/ML': <Zap className="inline text-twitter-blue-400" size={18} />, 
  'Web Dev': <Layers className="inline text-twitter-purple-400" size={18} />,
  'Blockchain': <Star className="inline text-twitter-yellow-400" size={18} />, 
  'IoT': <BookOpen className="inline text-twitter-green-400" size={18} />,
  'Cybersecurity': <Bell className="inline text-twitter-red-400" size={18} />,
  'Data Science': <BookOpen className="inline text-twitter-orange-400" size={18} />,
  'Game Dev': <Star className="inline text-twitter-blue-300" size={18} />,
  'Other': <Star className="inline text-twitter-dark-400" size={18} />,
};

const FILTERS = [
  { value: 'all', label: 'All', icon: <Star size={16} /> },
  { value: 'AI/ML', label: 'AI/ML', icon: <Zap size={16} className="text-twitter-blue-400" /> },
  { value: 'Web Dev', label: 'Web Dev', icon: <Layers size={16} className="text-twitter-purple-400" /> },
  { value: 'Blockchain', label: 'Blockchain', icon: <Star size={16} className="text-twitter-yellow-400" /> },
  { value: 'IoT', label: 'IoT', icon: <BookOpen size={16} className="text-twitter-green-400" /> },
  { value: 'Cybersecurity', label: 'Cybersecurity', icon: <Bell size={16} className="text-twitter-red-400" /> },
  { value: 'Data Science', label: 'Data Science', icon: <BookOpen size={16} className="text-twitter-orange-400" /> },
  { value: 'Game Dev', label: 'Game Dev', icon: <Star size={16} className="text-twitter-blue-300" /> },
  { value: 'Other', label: 'Other', icon: <Star size={16} className="text-twitter-dark-400" /> },
];

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let mounted = true;
    if (!target) { setValue(0); return; }
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    let cur = 0;
    const t = setInterval(() => {
      cur += step;
      if (!mounted) return;
      if (cur >= target) {
        setValue(target);
        clearInterval(t);
      } else {
        setValue(cur);
      }
    }, 16);
    return () => { mounted = false; clearInterval(t); };
  }, [target, duration]);
  return value;
}

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { isDark, colors } = useTheme();
  const [hackathons, setHackathons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState(null);

  // track hackathonId => boolean while we wait for registration processing
  const [pendingRegistrations, setPendingRegistrations] = useState({});
  // track hackathonId => boolean for confirmed registrations
  const [confirmedRegistrations, setConfirmedRegistrations] = useState({});
  const pollTimers = useRef(new Map());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [{ data: hacks }, { data: regs }] = await Promise.all([
          hackathonAPI.getStudentHackathons(),
          studentAPI.getRegistrations(),
        ]);
        if (!mounted) return;
        const registeredSet = new Set((regs.hackathons || []).map(r => r._id));
        const normalized = (hacks.hackathons || []).map(h => ({
          id: h._id,
          title: h.title,
          description: h.description,
          link: h.competitionLink,
          category: (h.tags && h.tags[0]) || 'Other',
          eventDate: h.eventDate,
          registrationDeadline: h.registrationDeadline,
          impressions: h.impressions,
          isRegistered: registeredSet.has(h._id),
          isNew: !!h.isHighlighted,
          registrations: h.registrations || 0,
          createdAt: h.createdAt,
          prizePool: h.prizePool,
          maxParticipants: h.maxParticipants,
        }));
        setHackathons(normalized);
      } catch (err) {
        // handled by interceptor
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => () => {
    // cleanup all poll timers and timeouts
    for (const [key, value] of pollTimers.current.entries()) {
      if (key.endsWith('_timeout')) {
        clearTimeout(value);
      } else {
        clearInterval(value);
      }
    }
    pollTimers.current.clear();
  }, []);

  const availableCount = useCountUp(hackathons.length);
  const registeredCount = useCountUp(hackathons.filter(h => h.isRegistered).length);
  const newCount = useCountUp(hackathons.filter(h => h.isNew).length);
  const viewsCount = useCountUp(hackathons.reduce((s, h) => s + (h.impressions || 0), 0));

  const startPolling = (hackathonId) => {
    if (pollTimers.current.has(hackathonId)) return;
    
    let attempts = 0;
    const maxAttempts = 20; // ~10 minutes at 30s interval
    const intervalMs = 30 * 1000;
    
    // Start polling after a brief delay to give backend time to start monitoring
    const initialDelay = setTimeout(() => {
      const timer = setInterval(async () => {
        attempts += 1;
        console.log(`🟡 StudentDashboard polling attempt ${attempts}/${maxAttempts} for hackathon ${hackathonId}`);
        
        try {
          const res = await studentAPI.getRegistrationStatus(hackathonId);
          const status = res?.data?.registration?.confirmationStatus;
          
          console.log(`🟡 StudentDashboard polling response:`, { status, isRegistered: res?.data?.isRegistered });
          
          if (status === 'confirmed') {
            console.log('🟢 StudentDashboard: Registration confirmed!');
            clearInterval(timer);
            pollTimers.current.delete(hackathonId);
            setPendingRegistrations(p => { const c = { ...p }; delete c[hackathonId]; return c; });
            setConfirmedRegistrations(p => ({ ...p, [hackathonId]: true }));
            setHackathons(prev => prev.map(h => h.id === hackathonId ? { ...h, isRegistered: true } : h));
            toast.success('Registration confirmed!');
          } else if (status === 'failed' && attempts >= 3) {
            // Only fail after multiple attempts (1.5 minutes)
            console.log('🔴 StudentDashboard: Registration failed after multiple attempts');
            clearInterval(timer);
            pollTimers.current.delete(hackathonId);
            setPendingRegistrations(p => { const c = { ...p }; delete c[hackathonId]; return c; });
            toast.error('Confirmation email not found after checking multiple times.');
          } else if (attempts >= maxAttempts) {
            console.log('🔴 StudentDashboard: Max polling attempts reached');
            clearInterval(timer);
            pollTimers.current.delete(hackathonId);
            setPendingRegistrations(p => { const c = { ...p }; delete c[hackathonId]; return c; });
            toast('Registration is still being monitored in the background. We will notify you when confirmed.');
          }
          // For 'pending' status or other states, continue polling
        } catch (err) {
          console.error('🔴 StudentDashboard polling error:', err);
          // Only stop polling after multiple consecutive errors AND max attempts reached
          if (attempts >= maxAttempts) {
            console.log('🔴 StudentDashboard: Stopping polling due to repeated errors');
            clearInterval(timer);
            pollTimers.current.delete(hackathonId);
            setPendingRegistrations(p => { const c = { ...p }; delete c[hackathonId]; return c; });
            toast.error('Unable to verify registration status. Please check manually or try again.');
          }
        }
      }, intervalMs);
      
      pollTimers.current.set(hackathonId, timer);
    }, 10000); // 10 second initial delay
    
    // Store the initial timeout so it can be cleared if needed
    pollTimers.current.set(hackathonId + '_timeout', initialDelay);
  };

  const handleRegister = async (hackathonId) => {
    try {
      // Set pending state immediately
      setPendingRegistrations(p => ({ ...p, [hackathonId]: true }));
      
      console.log(`🟡 Starting registration for hackathon ${hackathonId}`);
      const { data } = await hackathonAPI.registerForHackathon(hackathonId, { emailUsed: user?.email });
      
      console.log(`🟡 Registration API response:`, data);
      toast.success('Registration submitted successfully!', { duration: 4000 });
      
      // Start polling for confirmation
      startPolling(hackathonId);
      
    } catch (err) {
      console.error(`🔴 Registration failed for hackathon ${hackathonId}:`, err);
      // Only reset pending state on actual error
      setPendingRegistrations(p => { const c = { ...p }; delete c[hackathonId]; return c; });
      
      const errorMessage = err?.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleViewDetails = (h) => { setSelectedHackathon(h); setShowModal(true); };

  const filtered = hackathons.filter(h => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || h.title.toLowerCase().includes(q) || (h.description || '').toLowerCase().includes(q);
    const matchesCategory = filterCategory === 'all' || h.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-twitter-light-50 dark:bg-twitter-dark-900 text-twitter-dark-900 dark:text-white transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      
      {/* Header & Stats */}
      <div className="relative bg-gradient-to-r from-twitter-light-50 dark:from-twitter-dark-900 via-twitter-blue-50 dark:via-twitter-blue-900/30 to-twitter-green-50 dark:to-twitter-green-900/20 pb-8 pt-6 px-4 md:px-0 animate-fade-in-up transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gradient-twitter mb-1">Student Dashboard</h1>
            <p className="text-twitter-dark-600 dark:text-twitter-dark-300 transition-colors duration-200">
              Welcome back, {user?.name || 'Student'}!
            </p>
          </div>
          <button 
            onClick={logout}
            className="btn-primary hover-scale"
          >
            Sign Out
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          <div className="card-hover group">
            <div className="bg-gradient-twitter p-3 rounded-full mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <BarChart3 size={28} className="text-white" />
            </div>
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{availableCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">Available</div>
          </div>
          
          <div className="card-hover group">
            <div className="bg-gradient-success p-3 rounded-full mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <UserCheck size={28} className="text-white" />
            </div>
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{registeredCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">Registered</div>
          </div>
          
          <div className="card-hover group">
            <div className="bg-gradient-warning p-3 rounded-full mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Flame size={28} className="text-white" />
            </div>
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{newCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">New</div>
          </div>
          
          <div className="card-hover group">
            <div className="bg-gradient-to-r from-twitter-purple-500 to-twitter-blue-500 p-3 rounded-full mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Eye size={28} className="text-white" />
            </div>
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{viewsCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">Views</div>
          </div>
        </div>
      </div>
      
      {/* Search & Filter Row */}
      <div className="max-w-7xl mx-auto px-4 mt-8 flex flex-col md:flex-row gap-4 items-center animate-fade-in-up">
        <div className="relative w-full md:w-1/2">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-twitter-blue-500 dark:text-twitter-blue-400" />
          <input
            type="text"
            placeholder="Search hackathons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap mt-2 md:mt-0">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterCategory(f.value)}
              className={`
                flex items-center gap-1 px-4 py-2 rounded-full font-semibold 
                transition-all duration-200 border hover-scale
                ${
                  filterCategory === f.value 
                    ? 'bg-gradient-twitter text-white shadow-md border-twitter-blue-500' 
                    : 'bg-twitter-light-100 dark:bg-twitter-dark-700 text-twitter-blue-500 dark:text-twitter-blue-400 border-twitter-light-300 dark:border-twitter-dark-600 hover:bg-twitter-light-200 dark:hover:bg-twitter-dark-600'
                }
              `}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hackathons Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 mt-8 pb-20 animate-fade-in-up px-4">
        {filtered.map(h => (
          <div
            key={h.id}
            className="card-hover group h-[320px] flex flex-col hover-glow"
          >
            {/* Views chip */}
            <div className="absolute top-2 right-2 bg-twitter-light-100 dark:bg-twitter-dark-800 px-2 py-1 rounded-full flex items-center gap-1 text-twitter-blue-500 dark:text-twitter-blue-400 text-xs shadow z-10 transition-colors duration-200">
              <Eye size={12} /> {h.impressions || 0}
            </div>
            
            {/* Status Badges */}
            <div className="flex gap-1 mb-2 flex-wrap">
              {h.isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-warning text-white font-bold text-xs shadow animate-bounce-gentle">
                  <Flame size={12} /> NEW
                </span>
              )}
              {pendingRegistrations[h.id] && (
                <span className="status-warning animate-pulse text-xs">
                  <Clock size={12} /> CHECKING...
                </span>
              )}
              {h.isRegistered && confirmedRegistrations[h.id] && (
                <span className="status-success text-xs">
                  <CheckCircle size={12} /> CONFIRMED
                </span>
              )}
              {h.isRegistered && !confirmedRegistrations[h.id] && !pendingRegistrations[h.id] && (
                <span className="status-success text-xs">
                  <UserCheck size={12} /> REGISTERED
                </span>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-bold mb-2 text-twitter-dark-900 dark:text-white leading-tight line-clamp-2 transition-colors duration-200">
              {h.title}
            </h3>
            
            {/* Description */}
            <p className="text-twitter-dark-600 dark:text-twitter-dark-300 text-xs mb-3 leading-relaxed line-clamp-3 transition-colors duration-200">
              {h.description}
            </p>
            
            {/* Date, Countdown and Category */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-1">
                <Calendar size={14} className="text-twitter-blue-500 dark:text-twitter-blue-400 flex-shrink-0" />
                <span className="text-twitter-blue-600 dark:text-twitter-blue-300 text-xs transition-colors duration-200">
                  {h.eventDate ? new Date(h.eventDate).toLocaleDateString() : 'TBA'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-twitter-green-500 dark:text-twitter-green-400 flex-shrink-0" />
                <Countdown
                  target={h.eventDate}
                  compact
                  className="text-xs text-twitter-green-600 dark:text-twitter-green-300"
                  prefix="Starts in"
                />
              </div>
              <div className="flex items-center gap-1">
                {CATEGORY_ICONS[h.category] || <Star size={14} className="text-twitter-dark-400 flex-shrink-0" />} 
                <span className="text-xs text-twitter-dark-600 dark:text-twitter-dark-300 transition-colors duration-200">{h.category}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 mt-auto pt-2 flex-wrap">
              <button
                onClick={() => handleViewDetails(h)}
                className="btn-primary text-xs flex-1 min-w-[80px] hover-scale py-1 px-2"
              >
                View
              </button>
              
              {!h.isRegistered ? (
                <button 
                  onClick={() => handleRegister(h.id)} 
                  disabled={!!pendingRegistrations[h.id]} 
                  className={`
                    font-semibold text-xs py-1 px-2 rounded-full shadow transition-all flex-1 min-w-[70px]
                    ${
                      pendingRegistrations[h.id] 
                        ? 'bg-twitter-yellow-500 text-black hover:bg-twitter-yellow-600 cursor-not-allowed' 
                        : 'btn-secondary hover-scale'
                    }
                  `}
                >
                  {pendingRegistrations[h.id] ? '...' : 'Register'}
                </button>
              ) : (
                <button 
                  onClick={() => window.open(h.link, '_blank', 'noopener,noreferrer')}
                  className="bg-gradient-success text-white font-semibold text-xs py-1 px-2 rounded-full shadow hover-scale transition-all flex-1 min-w-[70px] focus:ring-1 focus:ring-twitter-green-400 focus:ring-offset-1 dark:focus:ring-offset-twitter-dark-800"
                >
                  Visit
                </button>
              )}
            </div>
            
            {/* External Link */}
            <div className="mt-3 pt-3 border-t border-twitter-light-200 dark:border-twitter-dark-700 transition-colors duration-200">
              <a 
                href={h.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-twitter-blue-500 dark:text-twitter-blue-400 hover:text-twitter-blue-600 dark:hover:text-twitter-blue-300 text-xs flex items-center gap-1 transition-colors duration-200"
              >
                <ExternalLink size={12} className="flex-shrink-0" /> 
                <span className="text-xs">Visit Page</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedHackathon && (
        <HackathonModal
          hackathon={selectedHackathon}
          mode="view"
          user={user}
          onClose={() => setShowModal(false)}
          onRegistered={(id) => setHackathons(prev => prev.map(x => x.id === id ? { ...x, isRegistered: true } : x))}
          hackathonAPI={hackathonAPI}
          studentAPI={studentAPI}
          registrationAPI={registrationAPI}
          toast={toast}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
