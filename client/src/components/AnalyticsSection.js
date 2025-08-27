import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  PieChart,
  Users,
  Filter,
  Download,
  Search,
  ChevronDown,
  X,
  Calendar,
  UserCheck,
  UserX,
  Eye,
  TrendingUp,
  Info
} from 'lucide-react';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

// Mock Chart Components (in a real implementation, you'd use recharts or similar)
const BarChart = ({ data, categories, title, onBarClick }) => {
  const maxValue = Math.max(...data.map(d => Math.max(d.registered || 0, d.notRegistered || 0)));

  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 size={20} className="text-blue-400" />
        {title}
      </h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-300">{item.name}</span>
              <span className="text-xs text-gray-400">
                {item.registered + item.notRegistered} total
              </span>
            </div>
            <div 
              className="relative h-8 bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => onBarClick && onBarClick(item)}
            >
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${maxValue > 0 ? (item.registered / maxValue) * 60 : 0}%` }}
              />
              <div 
                className="absolute h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500"
                style={{ 
                  left: `${maxValue > 0 ? (item.registered / maxValue) * 60 : 0}%`,
                  width: `${maxValue > 0 ? (item.notRegistered / maxValue) * 60 : 0}%` 
                }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium text-white">
                <span>{item.registered} registered</span>
                <span>{item.notRegistered} not registered</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DonutChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <PieChart size={20} className="text-purple-400" />
        {title}
      </h3>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="15.5"
              fill="transparent"
              stroke="rgb(55, 65, 81)"
              strokeWidth="1"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const circumference = 2 * Math.PI * 15.5;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = data.slice(0, index).reduce((acc, d) => 
                acc - ((d.value / total) * circumference), 0
              );
              
              return (
                <circle
                  key={index}
                  cx="16" cy="16" r="15.5"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="1"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-300">{item.label}</span>
            </div>
            <span className="text-sm font-medium text-white">
              {item.value} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsSection = ({ hackathons = [] }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('department');
  const [selectedHackathon, setSelectedHackathon] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [teamSizeFilter, setTeamSizeFilter] = useState('all');
  const [registrationStatus, setRegistrationStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [drilldownData, setDrilldownData] = useState(null);
  const [showDrilldown, setShowDrilldown] = useState(false);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (!hackathons.length) return;
    
    setLoading(true);
    try {
      const params = {
        period: dateRange,
        segment: selectedSegment,
        hackathonId: selectedHackathon !== 'all' ? selectedHackathon : undefined
      };

      // Get student engagement data which includes registered vs not-registered breakdown
      const { data } = await analyticsAPI.getStudentEngagement(params);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [hackathons, dateRange, selectedSegment, selectedHackathon]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Process data for visualization
  const processedData = useMemo(() => {
    if (!analyticsData?.studentEngagement) return { barData: [], donutData: [] };

    // Group students by the selected segment
    const groups = {};
    
    analyticsData.studentEngagement.forEach(student => {
      let segmentValue;
      
      switch (selectedSegment) {
        case 'department':
          segmentValue = student.student?.department || 'Unknown';
          break;
        case 'year':
          segmentValue = `Year ${student.student?.year || 'Unknown'}`;
          break;
        case 'registrationPattern':
          segmentValue = student.totalRegistrations > 0 ? 'Active' : 'Inactive';
          break;
        default:
          segmentValue = 'All Students';
      }

      if (!groups[segmentValue]) {
        groups[segmentValue] = { registered: 0, notRegistered: 0 };
      }

      if (student.totalRegistrations > 0) {
        groups[segmentValue].registered++;
      } else {
        groups[segmentValue].notRegistered++;
      }
    });

    const barData = Object.entries(groups).map(([name, data]) => ({
      name,
      registered: data.registered,
      notRegistered: data.notRegistered,
      total: data.registered + data.notRegistered
    })).sort((a, b) => b.total - a.total);

    const totalRegistered = barData.reduce((sum, item) => sum + item.registered, 0);
    const totalNotRegistered = barData.reduce((sum, item) => sum + item.notRegistered, 0);

    const donutData = [
      { label: 'Registered', value: totalRegistered, color: '#10b981' },
      { label: 'Not Registered', value: totalNotRegistered, color: '#ef4444' }
    ];

    return { barData, donutData };
  }, [analyticsData, selectedSegment]);

  // Handle bar click for drill-down
  const handleBarClick = useCallback((clickedItem) => {
    if (!analyticsData?.studentEngagement) return;

    const students = analyticsData.studentEngagement.filter(student => {
      let segmentValue;
      
      switch (selectedSegment) {
        case 'department':
          segmentValue = student.student?.department || 'Unknown';
          break;
        case 'year':
          segmentValue = `Year ${student.student?.year || 'Unknown'}`;
          break;
        case 'registrationPattern':
          segmentValue = student.totalRegistrations > 0 ? 'Active' : 'Inactive';
          break;
        default:
          return true;
      }

      return segmentValue === clickedItem.name;
    });

    setDrilldownData({
      segmentName: clickedItem.name,
      students: students.map(s => ({
        name: s.student?.name || 'Unknown',
        email: s.student?.email || 'Unknown',
        department: s.student?.department || 'Unknown',
        year: s.student?.year || 'Unknown',
        registrations: s.totalRegistrations,
        isRegistered: s.totalRegistrations > 0,
        registrationDate: s.lastRegistrationDate || null
      }))
    });
    setShowDrilldown(true);
  }, [analyticsData, selectedSegment]);

  // Export CSV functionality
  const handleExportCSV = useCallback(() => {
    if (!drilldownData?.students?.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Name', 'Email', 'Department', 'Year', 'Registrations', 'Last Registration'];
    const csvContent = [
      headers.join(','),
      ...drilldownData.students.map(student => [
        `"${student.name}"`,
        `"${student.email}"`,
        `"${student.department}"`,
        `"${student.year}"`,
        student.registrations,
        student.registrationDate ? new Date(student.registrationDate).toLocaleDateString() : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${drilldownData.segmentName.replace(/\s+/g, '_')}_students.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  }, [drilldownData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-400" />
            Registration Analytics
          </h2>
          <p className="text-gray-400 mt-1">
            Compare registered vs not-registered students by segment
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Segment By</label>
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="department">Department</option>
                <option value="year">Year</option>
                <option value="registrationPattern">Registration Pattern</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hackathon</label>
              <select
                value={selectedHackathon}
                onChange={(e) => setSelectedHackathon(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Hackathons</option>
                {hackathons.map(h => (
                  <option key={h.id} value={h.id}>{h.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Registration Status</label>
              <select
                value={registrationStatus}
                onChange={(e) => setRegistrationStatus(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="registered">Registered Only</option>
                <option value="not-registered">Not Registered Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Loading analytics...</span>
        </div>
      )}

      {/* Charts */}
      {!loading && processedData.barData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BarChart
              data={processedData.barData}
              title={`Registrations by ${selectedSegment.charAt(0).toUpperCase() + selectedSegment.slice(1)}`}
              onBarClick={handleBarClick}
            />
          </div>
          <div>
            <DonutChart
              data={processedData.donutData}
              title="Overall Registration Status"
            />
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && processedData.barData.length === 0 && (
        <div className="bg-white/5 backdrop-blur rounded-xl p-12 border border-gray-700 text-center">
          <Users className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No Analytics Data</h3>
          <p className="text-gray-400">
            No student registration data available for the selected filters.
          </p>
        </div>
      )}

      {/* Drill-down Modal */}
      {showDrilldown && drilldownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-xl shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {drilldownData.segmentName} - Student Details
                </h3>
                <p className="text-gray-400 mt-1">
                  {drilldownData.students.length} students found
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowDrilldown(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {drilldownData.students.map((student, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${student.isRegistered ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="font-medium text-white">{student.name}</div>
                        <div className="text-sm text-gray-400">{student.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300">
                        {student.department} - Year {student.year}
                      </div>
                      <div className="text-xs text-gray-400">
                        {student.registrations} registration{student.registrations !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;