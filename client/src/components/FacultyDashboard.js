import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, BarChart3, Eye, UserCheck, 
  Calendar, ExternalLink, Bell, Search, CheckCircle, Flame, BookOpen, Layers, Zap, Star, TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HackathonModal from './HackathonModal';
import AnalyticsSection from './AnalyticsSection';
import { hackathonAPI } from '../services/api';

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

const FacultyDashboard = () => {
  const { user, logout } = useAuth();
  const [hackathons, setHackathons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('hackathons'); // 'hackathons' | 'analytics'

  // Animated stats
  const totalCount = useCountUp(hackathons.length);
  const impressionsCount = useCountUp(hackathons.reduce((sum, h) => sum + (h.impressions || 0), 0));
  const registrationsCount = useCountUp(hackathons.reduce((sum, h) => sum + (h.registrations || 0), 0));
  const newCount = useCountUp(hackathons.filter(h => h.isNew).length);

  const handleCreateHackathon = () => {
    setSelectedHackathon({});
    setModalMode('edit');
    setShowModal(true);
  };

  const handleEditHackathon = (hackathon) => {
    setSelectedHackathon(hackathon);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewHackathon = (hackathon) => {
    setSelectedHackathon(hackathon);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDeleteHackathon = async (id) => {
    try {
      await hackathonAPI.deleteHackathon(id);
      setHackathons(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      // handled by interceptor
    }
  };

  const handleSaveHackathon = async (data) => {
    try {
      if (data.id) {
        // Update
        const payload = {
          title: data.title,
          description: data.description,
          competitionLink: data.link,
          registrationDeadline: data.registrationDeadline,
          eventDate: data.eventDate,
          tags: [data.category || 'Other'],
          competitionType: data.type,
          prizePool: data.prizePool,
          platform: data.platform,
          teamSizeMin: data.teamSizeMin ? parseInt(data.teamSizeMin) : undefined,
          teamSizeMax: data.teamSizeMax ? parseInt(data.teamSizeMax) : undefined,
          maxParticipants: data.maxParticipants,
          requirements: data.requirements,
          isActive: data.isActive,
          isHighlighted: data.isNew,
        };
        const { data: resp } = await hackathonAPI.updateHackathon(data.id, payload);
        const updated = resp.hackathon;
        setHackathons(prev => prev.map(h => h.id === data.id ? normalizeHackathon(updated) : h));
      } else {
        // Create
        const payload = {
          title: data.title,
          description: data.description,
          competitionLink: data.link,
          registrationDeadline: data.registrationDeadline,
          eventDate: data.eventDate,
          tags: [data.category || 'Other'],
          competitionType: data.type,
          prizePool: data.prizePool,
          platform: data.platform,
          teamSizeMin: data.teamSizeMin ? parseInt(data.teamSizeMin) : undefined,
          teamSizeMax: data.teamSizeMax ? parseInt(data.teamSizeMax) : undefined,
          maxParticipants: data.maxParticipants,
          requirements: data.requirements,
        };
        const { data: resp } = await hackathonAPI.createHackathon(payload);
        const created = resp.hackathon;
        setHackathons(prev => [normalizeHackathon(created), ...prev]);
      }
      setShowModal(false);
      setSelectedHackathon(null);
    } catch (e) {
      // handled globally
    }
  };

  const normalizeHackathon = (h) => ({
    id: h._id,
    title: h.title,
    description: h.description,
    link: h.competitionLink,
    category: (h.tags && h.tags[0]) || 'Other',
    type: h.competitionType,
    registrationDeadline: h.registrationDeadline,
    eventDate: h.eventDate,
    impressions: h.impressions || 0,
    registrations: h.registrations || 0,
    createdAt: h.createdAt,
    isNew: !!h.isHighlighted,
    isActive: !!h.isActive,
    prizePool: h.prizePool,
    platform: h.platform,
    teamSizeMin: h.teamSizeMin,
    teamSizeMax: h.teamSizeMax,
    maxParticipants: h.maxParticipants,
    requirements: h.requirements,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await hackathonAPI.getHackathons();
        if (!mounted) return;
        const normalized = (data.hackathons || []).map(normalizeHackathon);
        setHackathons(normalized);
      } catch (e) {
        // handled globally
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredHackathons = hackathons.filter(hackathon => {
    const matchesSearch = hackathon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hackathon.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || hackathon.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Header & Stats */}
      <div className="relative bg-gradient-to-r from-[#0D1117] via-[#00AEEF]/30 to-[#20C997]/20 pb-8 pt-6 px-4 md:px-0 animate-fade-in">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Faculty Dashboard</h1>
            <p className="text-[#A0AEC0] mt-1">Welcome, {user?.name || 'Faculty'}</p>
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
            <div className="text-3xl font-bold text-white">{totalCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">Total</div>
          </div>
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-[#5EEAD4] p-3 rounded-full mb-2 shadow-lg"><Eye size={28} /></div>
            <div className="text-3xl font-bold text-white">{impressionsCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">Impressions</div>
          </div>
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-[#20C997] p-3 rounded-full mb-2 shadow-lg"><UserCheck size={28} /></div>
            <div className="text-3xl font-bold text-white">{registrationsCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">Registrations</div>
          </div>
          <div className="relative group cursor-pointer bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-xl rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl hover:-translate-y-1 hover:rotate-1 transition-all">
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-3 rounded-full mb-2 shadow-lg"><Flame size={28} /></div>
            <div className="text-3xl font-bold text-white">{newCount}</div>
            <div className="text-sm text-[#A0AEC0] mt-1">New</div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-[rgba(13,17,23,0.95)] rounded-lg p-1 border border-[#A0AEC0]/10">
          <button
            onClick={() => setActiveTab('hackathons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'hackathons'
                ? 'bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white shadow-lg'
                : 'text-[#A0AEC0] hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar size={16} />
            Hackathons
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white shadow-lg'
                : 'text-[#A0AEC0] hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp size={16} />
            Analytics
          </button>
        </div>
      </div>
      {/* Content based on active tab */}
      {activeTab === 'hackathons' ? (
        <>
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
                className="relative group bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[#A0AEC0]/10 shadow-2xl rounded-2xl p-4 md:p-6 hover:shadow-3xl hover:-translate-y-2 hover:scale-105 transition-all cursor-pointer h-[420px] flex flex-col"
              >
                {/* Views chip */}
                <div className="absolute top-4 right-4 bg-[#0D1117] px-3 py-1 rounded-full flex items-center gap-1 text-[#5EEAD4] text-xs shadow z-10">
                  <Eye size={14} /> {hackathon.impressions || 0}
                </div>
                {/* Badges */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {hackathon.isNew && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-xs shadow animate-pulse">
                      <Flame size={14} /> NEW
                    </span>
                  )}
                </div>
                {/* Title with fixed height and truncation */}
                <h3 className="text-xl font-bold mb-3 text-white leading-tight overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', height: '3rem'}}>
                  {hackathon.title}
                </h3>
                {/* Description with proper fixed height and CSS truncation */}
                <p className="text-[#A0AEC0] text-sm mb-4 leading-relaxed break-words overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', height: '4.5rem'}}>
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
                    onClick={() => handleViewHackathon(hackathon)}
                    className="bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white font-bold py-2 px-4 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all hover:ring-2 hover:ring-[#5EEAD4] flex-1 min-w-[120px]"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleEditHackathon(hackathon)}
                    className="bg-[#20C997] text-white font-bold py-2 px-4 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all hover:ring-2 hover:ring-[#5EEAD4] flex-1 min-w-[80px]"
                  >
                    Edit 
                  </button>
                  <button
                    onClick={() => handleDeleteHackathon(hackathon.id)}
                    className="bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold py-2 px-3 rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all min-w-[80px]"
                  >
                    Delete
                  </button>
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
        </>
      ) : (
        <div className="max-w-7xl mx-auto px-4 mt-8 pb-20">
          <AnalyticsSection hackathons={hackathons} />
        </div>
      )}
      {/* Modal for view/edit */}
      {showModal && (
        <HackathonModal
          hackathon={selectedHackathon}
          mode={modalMode}
          onClose={() => setShowModal(false)}
          onSave={handleSaveHackathon}
        />
      )}
      {/* Floating Create Button */}
      <button
        onClick={handleCreateHackathon}
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-[#00AEEF] to-[#20C997] text-white font-bold py-4 px-8 rounded-full shadow-2xl text-lg flex items-center gap-2 animate-pulse hover:scale-105 transition-transform ring-2 ring-[#5EEAD4]"
        style={{ boxShadow: '0 8px 32px 0 #00AEEF55' }}
      >
        <Plus size={24} /> Create Hackathon
      </button>
    </div>
  );
};

export default FacultyDashboard;
