import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, ExternalLink, Eye, UserCheck, 
  Bell, BookOpen, Building, Star, CheckCircle, Flame, Layers, Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HackathonModal from './HackathonModal';
import { hackathonAPI, studentAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  'AI/ML': <Zap className="inline text-cyan-400" size={18} />, 
  'Web Dev': <Layers className="inline text-purple-400" size={18} />,
  'Blockchain': <Star className="inline text-yellow-400" size={18} />, 
  'IoT': <Building className="inline text-green-400" size={18} />,
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
  { value: 'IoT', label: 'IoT', icon: <Building size={16} className="text-green-400" /> },
  { value: 'Cybersecurity', label: 'Cybersecurity', icon: <Bell size={16} className="text-pink-400" /> },
  { value: 'Data Science', label: 'Data Science', icon: <BookOpen size={16} className="text-orange-400" /> },
  { value: 'Game Dev', label: 'Game Dev', icon: <Star size={16} className="text-indigo-400" /> },
  { value: 'Other', label: 'Other', icon: <Star size={16} className="text-gray-400" /> },
];

function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(interval);
      } else {
        setValue(start);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return value;
}

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [hackathons, setHackathons] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', department: '', year: 1, registrationNumber: '' });
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        // Ensure profile completeness for students
        if (user?.role === 'student') {
          const { data: prof } = await studentAPI.getProfile();
          const u = prof.user || {};
          const missing = !u.name || !u.department || !u.year || !u.registrationNumber;
          if (missing) {
            setProfileForm({
              name: u.name || '',
              department: u.department || '',
              year: u.year || 1,
              registrationNumber: u.registrationNumber || ''
            });
            setShowProfileModal(true);
          }
        }
        const [{ data: hacks }, { data: regs }] = await Promise.all([
          hackathonAPI.getStudentHackathons(),
          studentAPI.getRegistrations(),
        ]);
        if (!mounted) return;
        const registeredIdSet = new Set((regs.hackathons || []).map(h => h._id));
        const normalized = (hacks.hackathons || []).map(h => ({
          id: h._id,
          title: h.title,
          description: h.description,
          link: h.competitionLink,
          category: (h.tags && h.tags[0]) || 'Other',
          type: h.competitionType,
          registrationDeadline: h.registrationDeadline,
          eventDate: h.eventDate,
          impressions: h.impressions,
          registrations: h.registrations,
          createdAt: h.createdAt,
          isNew: h.isHighlighted,
          isRegistered: registeredIdSet.has(h._id),
        }));
        setHackathons(normalized);
      } catch (e) {
        // handled globally
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState(null);

  // Animated stats
  const availableCount = useCountUp(hackathons.length);
  const registeredCount = useCountUp(hackathons.filter(h => h.isRegistered).length);
  const newCount = useCountUp(hackathons.filter(h => h.isNew).length);
  const viewsCount = useCountUp(hackathons.reduce((sum, h) => sum + h.impressions, 0));

  const handleRegister = async (hackathonId) => {
    try {
      await hackathonAPI.registerForHackathon(hackathonId, { emailUsed: user?.email });
      setHackathons(prev => prev.map(h => 
        h.id === hackathonId ? { ...h, isRegistered: true } : h
      ));
    } catch (e) {
      // error toast is global
    }
  };

  const handleViewDetails = (hackathon) => {
    setSelectedHackathon(hackathon);
    setShowModal(true);
  };

  const filteredHackathons = hackathons
    .filter(hackathon => {
      const matchesSearch = hackathon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           hackathon.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || hackathon.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0D1117] border border-[#1F2937] rounded-2xl shadow-2xl w-full max-w-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
            <p className="text-[#A0AEC0] mb-4 text-sm">Please provide the following details to continue.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#A0AEC0] mb-1">Name</label>
                <input className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" value={profileForm.name} onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-[#A0AEC0] mb-1">Department</label>
                <input className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" value={profileForm.department} onChange={(e) => setProfileForm(p => ({ ...p, department: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-[#A0AEC0] mb-1">Year (1-4)</label>
                <input type="number" min="1" max="4" className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" value={profileForm.year} onChange={(e) => setProfileForm(p => ({ ...p, year: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-sm text-[#A0AEC0] mb-1">Registration Number</label>
                <input className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#1F2937] text-white" value={profileForm.registrationNumber} onChange={(e) => setProfileForm(p => ({ ...p, registrationNumber: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { toast.error('Profile required to proceed'); }} className="px-4 py-2 rounded-lg bg-[#111827] text-[#A0AEC0] border border-[#1F2937]">Cancel</button>
              <button onClick={async () => {
                try {
                  await studentAPI.updateProfile(profileForm);
                  toast.success('Profile updated');
                  setShowProfileModal(false);
                } catch (_) {}
              }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white">Save</button>
            </div>
          </div>
        </div>
      )}
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
            <div className="bg-[#00AEEF] p-3 rounded-full mb-2 shadow-lg"><BookOpen size={28} /></div>
            <div className="text-3xl font-bold text-white">{availableCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">Available</div>
          </div>
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-[#20C997] p-3 rounded-full mb-2 shadow-lg"><CheckCircle size={28} /></div>
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
      {/* Hackathons List */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-8 mt-10 pb-20 animate-fade-in px-4">
        {filteredHackathons.map((hackathon) => (
          <div
            key={hackathon.id}
            className="relative group bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-2xl rounded-2xl p-4 md:p-6 hover:shadow-3xl hover:-translate-y-2 hover:scale-105 transition-all cursor-pointer min-h-[400px] flex flex-col"
          >
            {/* Views chip */}
            <div className="absolute top-4 right-4 bg-[#0D1117] px-3 py-1 rounded-full flex items-center gap-1 text-[#5EEAD4] text-xs shadow z-10">
              <Eye size={14} /> {hackathon.impressions}
            </div>
            {/* Badges */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {hackathon.isNew && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-xs shadow animate-pulse">
                  <Flame size={14} /> NEW
                </span>
              )}
              {hackathon.isRegistered && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#20C997] to-[#00AEEF] text-white font-bold text-xs shadow">
                  <CheckCircle size={14} /> REGISTERED
                </span>
              )}
            </div>
            {/* Title with proper wrapping */}
            <h3 className="text-xl font-bold mb-3 text-white leading-tight break-words hyphens-auto min-h-[3rem] flex items-start">
              {hackathon.title}
            </h3>
            {/* Description with proper wrapping */}
            <p className="text-[#A0AEC0] text-sm mb-4 leading-relaxed break-words hyphens-auto flex-1 min-h-[4rem]">
              {hackathon.description}
            </p>
            {/* Date and Category */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#00AEEF] flex-shrink-0" />
                <span className="text-[#00AEEF] text-xs break-words">
                  {new Date(hackathon.eventDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {CATEGORY_ICONS[hackathon.category] || <Star size={18} className="text-[#A0AEC0] flex-shrink-0" />} 
                <span className="text-xs text-[#00AEEF] break-words">{hackathon.category}</span>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto pt-4 flex-wrap">
              <button
                onClick={() => handleViewDetails(hackathon)}
                className="flex-1 bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white font-bold py-2 px-4 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all hover:ring-2 hover:ring-[#5EEAD4] min-w-[120px]"
              >
                View Details
              </button>
              {!hackathon.isRegistered ? (
                <button
                  onClick={() => handleRegister(hackathon.id)}
                  className="flex-1 bg-[#00AEEF] text-white font-bold py-2 px-4 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all animate-pulse hover:ring-2 hover:ring-[#5EEAD4] min-w-[100px]"
                >
                  Register
                </button>
              ) : (
                <button
                  className="flex-1 bg-[#A0AEC0] text-[#0D1117] font-bold py-2 px-4 rounded-full shadow cursor-pointer hover:scale-105 transition-all min-w-[100px]"
                  onClick={() => handleViewDetails(hackathon)}
                >
                  Registered
                </button>
              )}
            </div>
            {/* External Link */}
            <div className="mt-4 pt-4 border-t border-[#A0AEC0]/20">
              <a 
                href={hackathon.link} 
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
      {/* Modal for view details */}
      {showModal && (
        <HackathonModal
          hackathon={selectedHackathon}
          mode="view"
          onClose={() => setShowModal(false)}
          onRegistered={(id) => setHackathons(prev => prev.map(h => h.id === id ? { ...h, isRegistered: true } : h))}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
