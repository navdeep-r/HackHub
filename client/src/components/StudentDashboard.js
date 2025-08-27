import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ExternalLink, Calendar, Eye, UserCheck, 
  BarChart3, Flame, BookOpen, Layers, Zap, Star, Bell, CheckCircle, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HackathonModal from './HackathonModal';
import { hackathonAPI, studentAPI } from '../services/api';
import toast from 'react-hot-toast';

// Utility function for countdown timer
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

// CountdownTimer Component
const CountdownTimer = ({ deadline, className = "" }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(deadline));
  
  useEffect(() => {
    if (!deadline) return;
    
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [deadline]);
  
  return (
    <div className={`flex gap-1 font-mono ${className}`}>
      <div className="flex flex-col items-center">
        <div className="bg-green-500 text-white px-2 py-1 rounded min-w-[30px] text-center text-xs">
          {String(timeLeft.days).padStart(2, '0')}
        </div>
        <div className="text-xs text-gray-400 mt-1">D</div>
      </div>
      <div className="text-blue-400 flex items-center text-xs">:</div>
      <div className="flex flex-col items-center">
        <div className="bg-green-500 text-white px-2 py-1 rounded min-w-[30px] text-center text-xs">
          {String(timeLeft.hours).padStart(2, '0')}
        </div>
        <div className="text-xs text-gray-400 mt-1">H</div>
      </div>
      <div className="text-blue-400 flex items-center text-xs">:</div>
      <div className="flex flex-col items-center">
        <div className="bg-green-500 text-white px-2 py-1 rounded min-w-[30px] text-center text-xs">
          {String(timeLeft.mins).padStart(2, '0')}
        </div>
        <div className="text-xs text-gray-400 mt-1">M</div>
      </div>
    </div>
  );
};

const CATEGORY_ICONS = {
  'AI/ML': <Zap className="inline text-cyan-400" size={18} />, 
  'Web Dev': <Layers className="inline text-purple-400" size={18} />,
  'Blockchain': <Star className="inline text-yellow-400" size={18} />, 
  'IoT': <BookOpen className="inline text-green-400" size={18} />,
  'Cybersecurity': <Bell className="inline text-pink-400" size={18} />,
  'Data Science': <BookOpen className="inline text-orange-400" size={18} />,
  'Game Dev': <Star className="inline text-indigo-400" size={18} />,
  'Other': <Star className="inline text-gray-400" size={18} />,
};

const FILTERS = [
  { value: 'all', label: 'All', icon: <Star size={16} /> },
  { value: 'AI/ML', label: 'AI/ML', icon: <Zap size={16} className="text-cyan-400" /> },
  { value: 'Web Dev', label: 'Web Dev', icon: <Layers size={16} className="text-purple-400" /> },
  { value: 'Blockchain', label: 'Blockchain', icon: <Star size={16} className="text-yellow-400" /> },
  { value: 'IoT', label: 'IoT', icon: <BookOpen size={16} className="text-green-400" /> },
  { value: 'Cybersecurity', label: 'Cybersecurity', icon: <Bell size={16} className="text-pink-400" /> },
  { value: 'Data Science', label: 'Data Science', icon: <BookOpen size={16} className="text-orange-400" /> },
  { value: 'Game Dev', label: 'Game Dev', icon: <Star size={16} className="text-indigo-400" /> },
  { value: 'Other', label: 'Other', icon: <Star size={16} className="text-gray-400" /> },
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
  const [hackathons, setHackathons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState(null);

  // track hackathonId => boolean while we wait for email confirmation
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
            toast.success('Registration confirmed via email.');
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
      toast.success('Registration submitted! Checking for email confirmation...', { duration: 4000 });
      
      if (data && !data.gmailLinked && data.gmailAuthUrl) {
        toast.info('Please link Gmail to enable automatic confirmation checks. Opening in new tab...', { duration: 6000 });
        try { 
          window.open(data.gmailAuthUrl, '_blank', 'noopener,noreferrer'); 
        } catch (e) { 
          console.error('Failed to open Gmail auth URL:', e);
        }
      }
      
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
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Header & Stats */}
      <div className="relative bg-gradient-to-r from-[#0D1117] via-[#00AEEF]/30 to-[#20C997]/20 pb-8 pt-6 px-4 md:px-0 animate-fade-in">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Student Dashboard</h1>
            <p className="text-[#A0AEC0] mt-1">Welcome, {user?.name || 'Student'}</p>
          </div>
          <button 
            onClick={logout}
            className="bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white px-5 py-2 rounded-full font-bold shadow-lg hover:scale-105 hover:ring-2 hover:ring-[#5EEAD4] transition-transform"
          >
            Logout
          </button>
        </div>
        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-[#00AEEF] p-3 rounded-full mb-2 shadow-lg"><BarChart3 size={28} /></div>
            <div className="text-3xl font-bold text-white">{availableCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">Available</div>
          </div>
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-[#20C997] p-3 rounded-full mb-2 shadow-lg"><UserCheck size={28} /></div>
            <div className="text-3xl font-bold text-white">{registeredCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">Registered</div>
          </div>
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-3 rounded-full mb-2 shadow-lg"><Flame size={28} /></div>
            <div className="text-3xl font-bold text-white">{newCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">New</div>
          </div>
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-[#5EEAD4] p-3 rounded-full mb-2 shadow-lg"><Eye size={28} /></div>
            <div className="text-3xl font-bold text-white">{viewsCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">Views</div>
          </div>
        </div>
      </div>
      
      {/* Search & Filter Row */}
      <div className="max-w-7xl mx-auto px-4 mt-8 flex flex-col md:flex-row gap-4 items-center animate-fade-in">
        <div className="relative w-full md:w-1/2">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00AEEF]" />
          <input
            type="text"
            placeholder="Search hackathons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-full bg-[rgba(13,17,23,0.95)] border-none text-white focus:ring-2 focus:ring-[#00AEEF] placeholder:text-[#A0AEC0] shadow"
          />
        </div>
        <div className="flex gap-2 flex-wrap mt-2 md:mt-0">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterCategory(f.value)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full font-semibold shadow transition-all border border-[#00AEEF]/20 ${filterCategory === f.value ? 'bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white scale-105' : 'bg-[rgba(13,17,23,0.95)] text-[#00AEEF] hover:scale-105'}`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hackathons Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-8 mt-10 pb-20 animate-fade-in px-4">
        {filtered.map(h => (
          <div
            key={h.id}
            className="relative group bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-2xl rounded-2xl p-4 md:p-6 hover:shadow-3xl hover:-translate-y-2 hover:scale-105 transition-all cursor-pointer h-[420px] flex flex-col"
          >
            {/* Views chip */}
            <div className="absolute top-4 right-4 bg-[#0D1117] px-3 py-1 rounded-full flex items-center gap-1 text-[#5EEAD4] text-xs shadow z-10">
              <Eye size={14} /> {h.impressions || 0}
            </div>
            
            {/* Badges */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {h.isNew && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-xs shadow animate-pulse">
                  <Flame size={14} /> NEW
                </span>
              )}
              {pendingRegistrations[h.id] && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500 text-black font-bold text-xs shadow">
                  <Clock size={14} /> CHECKING...
                </span>
              )}
              {h.isRegistered && confirmedRegistrations[h.id] && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xs shadow">
                  <CheckCircle size={14} /> CONFIRMED
                </span>
              )}
              {h.isRegistered && !confirmedRegistrations[h.id] && !pendingRegistrations[h.id] && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-xs shadow">
                  <UserCheck size={14} /> REGISTERED
                </span>
              )}
            </div>
            
            {/* Title with fixed height and truncation */}
            <h3 className="text-xl font-bold mb-3 text-white leading-tight overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', height: '3rem'}}>
              {h.title}
            </h3>
            
            {/* Description with proper fixed height and CSS truncation */}
            <p className="text-[#A0AEC0] text-sm mb-4 leading-relaxed break-words overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', height: '4.5rem'}}>
              {h.description}
            </p>
            
            {/* Date and Category */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#00AEEF] flex-shrink-0" />
                <span className="text-[#00AEEF] text-xs break-words">
                  {h.eventDate ? new Date(h.eventDate).toLocaleDateString() : 'TBA'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {CATEGORY_ICONS[h.category] || <Star size={18} className="text-[#A0AEC0] flex-shrink-0" />} 
                <span className="text-xs text-[#00AEEF] break-words">{h.category}</span>
              </div>
            </div>
            
            {/* Countdown Timer */}
            {h.registrationDeadline && new Date(h.registrationDeadline) > new Date() && (
              <div className="bg-gradient-to-r from-blue-500/20 to-green-500/20 rounded-lg p-3 mb-4 border border-blue-500/30">
                <div className="text-center">
                  <div className="text-xs text-blue-300 mb-2">Registration Ends In</div>
                  <CountdownTimer deadline={h.registrationDeadline} className="text-sm" />
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto pt-4 flex-wrap">
              <button
                onClick={() => handleViewDetails(h)}
                className="bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white font-bold py-2 px-4 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all hover:ring-2 hover:ring-[#5EEAD4] flex-1 min-w-[120px]"
              >
                View Details
              </button>
              
              {!h.isRegistered ? (
                <button 
                  onClick={() => handleRegister(h.id)} 
                  disabled={!!pendingRegistrations[h.id]} 
                  className={`font-bold py-2 px-4 rounded-full shadow-lg transition-all flex-1 min-w-[100px] ${
                    pendingRegistrations[h.id] 
                      ? 'bg-yellow-500 text-black hover:bg-yellow-600' 
                      : 'bg-[#00AEEF] text-white hover:scale-105 hover:shadow-2xl hover:ring-2 hover:ring-[#5EEAD4]'
                  }`}
                >
                  {pendingRegistrations[h.id] ? 'Checking...' : 'Register'}
                </button>
              ) : (
                <button 
                  onClick={() => window.open(h.link, '_blank', 'noopener,noreferrer')}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-2 px-4 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all flex-1 min-w-[100px] hover:ring-2 hover:ring-green-300"
                >
                  Visit Site
                </button>
              )}
            </div>
            
            {/* External Link */}
            <div className="mt-4 pt-4 border-t border-[#A0AEC0]/20">
              <a 
                href={h.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00AEEF] hover:text-[#5EEAD4] text-xs flex items-center gap-1 break-words"
              >
                <ExternalLink size={14} className="flex-shrink-0" /> 
                <span className="break-words">Visit Competition Page</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedHackathon && (
        <HackathonModal
          hackathon={selectedHackathon}
          mode="view"
          onClose={() => setShowModal(false)}
          onRegistered={(id) => setHackathons(prev => prev.map(x => x.id === id ? { ...x, isRegistered: true } : x))}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
