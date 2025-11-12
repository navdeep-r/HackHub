import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, BarChart3, Eye, UserCheck, 
  Calendar, ExternalLink, Bell, Search, CheckCircle, Flame, BookOpen, Layers, Zap, Star, TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import HackathonModal from './HackathonModal';
import AnalyticsSection from './AnalyticsSection';
import ThemeToggle from './ThemeToggle';
import { hackathonAPI } from '../services/api';

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

function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // if target is falsy or 0, set immediately and return
    if (!target) {
      setValue(0);
      return;
    }

    let start = 0;
    // number of ticks at ~16ms per frame
    const ticks = Math.max(1, Math.round(duration / 16));
    const step = Math.ceil(target / ticks);

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
  const { isDark, colors } = useTheme();
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
      console.log('[Delete] attempting to delete hackathon id=', id);
      await hackathonAPI.deleteHackathon(id);
      setHackathons(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      // Log extra details for debugging
      console.error('[Delete] error deleting hackathon', id, e?.response?.status, e?.response?.data || e.message);
      // handled by interceptor / global handler
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
          competitionType: data.type === 'free' ? 'unpaid' : data.type,
          prizePool: data.prizePool,
          platform: data.platform,
          teamSizeMin: data.teamSizeMin ? parseInt(data.teamSizeMin, 10) : undefined,
          teamSizeMax: data.teamSizeMax ? parseInt(data.teamSizeMax, 10) : undefined,
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
          competitionType: data.type === 'free' ? 'unpaid' : data.type,
          prizePool: data.prizePool,
          platform: data.platform,
          teamSizeMin: data.teamSizeMin ? parseInt(data.teamSizeMin, 10) : undefined,
          teamSizeMax: data.teamSizeMax ? parseInt(data.teamSizeMax, 10) : undefined,
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
    id: h._id || h.id,
    title: h.title || '',
    description: h.description || '',
    link: h.competitionLink || h.link || '',
    category: (h.tags && h.tags[0]) || 'Other',
    type: h.competitionType || h.type || '',
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
    const title = (hackathon.title || '').toString().toLowerCase();
    const description = (hackathon.description || '').toString().toLowerCase();
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = term === '' || title.includes(term) || description.includes(term);
    const matchesCategory = filterCategory === 'all' || (hackathon.category || 'Other') === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-twitter-light-50 dark:bg-twitter-dark-900 text-twitter-dark-900 dark:text-white transition-colors duration-300">
      {/* Theme Toggle (removed duplicate top button) */}
      
      {/* Header & Stats */}
      <div className="relative bg-gradient-to-r from-twitter-light-50 dark:from-twitter-dark-900 via-twitter-blue-50 dark:via-twitter-blue-900/30 to-twitter-green-50 dark:to-twitter-green-900/20 pb-8 pt-6 px-4 md:px-0 animate-fade-in-up transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gradient-twitter mb-1">Faculty Dashboard</h1>
            <p className="text-twitter-dark-600 dark:text-twitter-dark-300 transition-colors duration-200">
              Welcome back, {user?.name || 'Faculty'}!
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
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{totalCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">Total</div>
          </div>
          
          <div className="card-hover group">
            <div className="bg-gradient-to-r from-twitter-purple-500 to-twitter-blue-500 p-3 rounded-full mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Eye size={28} className="text-white" />
            </div>
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{impressionsCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">Impressions</div>
          </div>
          
          <div className="card-hover group">
            <div className="bg-gradient-success p-3 rounded-full mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <UserCheck size={28} className="text-white" />
            </div>
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{registrationsCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">Registrations</div>
          </div>
          
          <div className="card-hover group">
            <div className="bg-gradient-warning p-3 rounded-full mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Flame size={28} className="text-white" />
            </div>
            <div className="text-3xl font-bold text-twitter-dark-900 dark:text-white mb-1">{newCount}</div>
            <div className="text-sm text-twitter-dark-500 dark:text-twitter-dark-400">New</div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-twitter-light-100 dark:bg-twitter-dark-800 rounded-xl p-1 border border-twitter-light-200 dark:border-twitter-dark-700 transition-colors duration-200">
          <button
            onClick={() => setActiveTab('hackathons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'hackathons'
                ? 'bg-gradient-twitter text-white shadow-md'
                : 'text-twitter-dark-600 dark:text-twitter-dark-300 hover:text-twitter-blue-500 dark:hover:text-twitter-blue-400 hover:bg-twitter-light-200 dark:hover:bg-twitter-dark-700'
            }`}
          >
            <Calendar size={16} />
            Hackathons
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-twitter text-white shadow-md'
                : 'text-twitter-dark-600 dark:text-twitter-dark-300 hover:text-twitter-blue-500 dark:hover:text-twitter-blue-400 hover:bg-twitter-light-200 dark:hover:bg-twitter-dark-700'
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
          
          {/* Hackathons List */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-8 mt-10 pb-20 animate-fade-in-up px-4">
            {filteredHackathons.map((hackathon) => (
              <div
                key={hackathon.id || hackathon.title}
                className="card-hover group h-[420px] flex flex-col hover-glow relative"
              >
                {/* Views chip */}
                <div className="absolute top-4 right-4 bg-twitter-light-100 dark:bg-twitter-dark-800 px-3 py-1 rounded-full flex items-center gap-1 text-twitter-blue-500 dark:text-twitter-blue-400 text-xs shadow-md z-10 transition-colors duration-200">
                  <Eye size={14} /> {hackathon.impressions || 0}
                </div>
                
                {/* Status Badges */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {hackathon.isNew && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-warning text-white font-bold text-xs shadow animate-bounce-gentle">
                      <Flame size={14} /> NEW
                    </span>
                  )}
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold mb-3 text-twitter-dark-900 dark:text-white leading-tight line-clamp-2 transition-colors duration-200">
                  {hackathon.title}
                </h3>
                
                {/* Description */}
                <p className="text-twitter-dark-600 dark:text-twitter-dark-300 text-sm mb-4 leading-relaxed line-clamp-3 transition-colors duration-200">
                  {hackathon.description}
                </p>
                
                {/* Date and Category */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-twitter-blue-500 dark:text-twitter-blue-400 flex-shrink-0" />
                    <span className="text-twitter-blue-600 dark:text-twitter-blue-300 text-xs transition-colors duration-200">
                      {hackathon.eventDate ? new Date(hackathon.eventDate).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICONS[hackathon.category] || <Star size={18} className="text-twitter-dark-400 flex-shrink-0" />} 
                    <span className="text-xs text-twitter-dark-600 dark:text-twitter-dark-300 transition-colors duration-200">{hackathon.category || 'Other'}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto pt-4 flex-wrap">
                  <button
                    onClick={() => handleViewHackathon(hackathon)}
                    className="btn-primary flex-1 min-w-[120px] hover-scale"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleEditHackathon(hackathon)}
                    className="bg-gradient-success text-white font-semibold py-2 px-4 rounded-full shadow-md hover-scale transition-all flex-1 min-w-[80px] focus:ring-2 focus:ring-twitter-green-400 focus:ring-offset-2 dark:focus:ring-offset-twitter-dark-800"
                  >
                    Edit 
                  </button>
                  <button
                    onClick={() => handleDeleteHackathon(hackathon.id)}
                    className="bg-gradient-error text-white font-semibold py-2 px-3 rounded-full shadow-md hover-scale transition-all min-w-[80px] focus:ring-2 focus:ring-twitter-red-400 focus:ring-offset-2 dark:focus:ring-offset-twitter-dark-800"
                  >
                    Delete
                  </button>
                </div>
                
                {/* External Link */}
                <div className="mt-4 pt-4 border-t border-twitter-light-200 dark:border-twitter-dark-700 transition-colors duration-200">
                  <a 
                    href={hackathon.link || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-twitter-blue-500 dark:text-twitter-blue-400 hover:text-twitter-blue-600 dark:hover:text-twitter-blue-300 text-xs flex items-center gap-1 transition-colors duration-200"
                  >
                    <ExternalLink size={14} className="flex-shrink-0" /> 
                    <span>Visit Competition Page</span>
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
        className="
          fixed bottom-8 right-8 z-50 bg-gradient-twitter text-white 
          font-semibold py-4 px-6 rounded-full shadow-2xl text-lg 
          flex items-center gap-2 hover-scale hover-glow
          focus:outline-none focus:ring-2 focus:ring-twitter-blue-400 focus:ring-offset-2 
          dark:focus:ring-offset-twitter-dark-900
          transition-all duration-300
        "
      >
        <Plus size={24} /> Create Hackathon
      </button>
    </div>
  );
};

export default FacultyDashboard;
