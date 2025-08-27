import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart3, PieChart, Download, Filter, TrendingUp, Activity, Eye, UserCheck, Target, ChevronDown, 
  RefreshCw, Search, X, AlertCircle
} from 'lucide-react';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

// Mock chart components (replace with actual chart library like recharts)
const BarChart = ({ data, title, className }) => (
  <div className={`bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700 ${className}`}>
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <BarChart3 className="text-blue-400" size={20} />
      {title}
    </h3>
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">{item.name}</span>
          <div className="flex items-center gap-3 flex-1 ml-4">
            <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%` }}
              />
            </div>
            <span className="text-white font-bold text-sm min-w-[2rem] text-right">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DonutChart = ({ data, title, className }) => (
  <div className={`bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700 ${className}`}>
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <PieChart className="text-purple-400" size={20} />
      {title}
    </h3>
    <div className="flex items-center justify-center mb-4">
      <div className="relative w-32 h-32 rounded-full border-8 border-gray-700">
        <div className="absolute inset-0 rounded-full border-8 border-t-blue-500 border-r-green-500 border-b-purple-500 border-l-orange-500 animate-pulse"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{data.reduce((sum, item) => sum + item.value, 0)}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
        </div>
      </div>
    </div>
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'][idx % 4]}`}></div>
            <span className="text-gray-300 text-sm">{item.name}</span>
          </div>
          <span className="text-white font-bold text-sm">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const MetricCard = ({ title, value, icon: Icon, trend, color = "blue" }) => (
  <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg bg-${color}-500/20`}>
        <Icon className={`text-${color}-400`} size={24} />
      </div>
    </div>
  </div>
);

const AnalyticsSection = ({ hackathons = [] }) => {
  const [dateRange, setDateRange] = useState('30');
  const [teamSizeFilter, setTeamSizeFilter] = useState('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Real-time analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    studentEngagement: null,
    timeSeries: null,
    loading: true,
    error: null
  });
  
  // Fetch analytics data on component mount and when filters change
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));
        
        // Fetch overview analytics with current date range
        const overviewResponse = await analyticsAPI.getOverview({ period: dateRange });
        
        // Fetch student engagement data
        const engagementResponse = await analyticsAPI.getStudentEngagement();
        
        // Fetch time series data
        const timeSeriesResponse = await analyticsAPI.getTimeSeries({ period: dateRange });
        
        setAnalyticsData({
          overview: overviewResponse.data.overview,
          studentEngagement: engagementResponse.data.studentEngagement,
          timeSeries: timeSeriesResponse.data.timeSeriesData,
          loading: false,
          error: null
        });
        
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        setAnalyticsData(prev => ({
          ...prev,
          loading: false,
          error: error?.response?.data?.error || 'Failed to load analytics data'
        }));
        toast.error('Failed to load analytics data');
      }
    };
    
    fetchAnalyticsData();
  }, [dateRange]); // Re-fetch when date range changes

  // Process real analytics data
  const processedAnalyticsData = useMemo(() => {
    if (!analyticsData.overview || !analyticsData.studentEngagement) {
      return {
        registeredBySegment: [],
        teamSizeDistribution: [],
        registrationTrends: []
      };
    }

    // Process department-wise registration data from student engagement
    const departmentStats = {};
    analyticsData.studentEngagement.forEach(student => {
      const dept = student.student?.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { registered: 0, notRegistered: 0 };
      }
      if (student.totalRegistrations > 0) {
        departmentStats[dept].registered += 1;
      } else {
        departmentStats[dept].notRegistered += 1;
      }
    });

    const registeredBySegment = Object.entries(departmentStats).map(([name, stats]) => ({
      name,
      registered: stats.registered,
      notRegistered: stats.notRegistered
    }));

    // Process category-wise performance from overview
    const categoryStats = analyticsData.overview.categoryStats || {};
    const teamSizeDistribution = Object.entries(categoryStats).map(([name, stats]) => ({
      name,
      value: stats.registrations || 0
    })).slice(0, 5); // Limit to top 5 categories

    // Process time series data for registration trends
    const timeSeries = analyticsData.timeSeries || [];
    const registrationTrends = timeSeries.slice(-4).map((data, index) => ({
      name: `Week ${index + 1}`,
      value: data.registrations || 0
    }));

    return {
      registeredBySegment,
      teamSizeDistribution,
      registrationTrends
    };
  }, [analyticsData]);

  // Calculate metrics from real analytics data
  const metrics = useMemo(() => {
    if (!analyticsData.overview) {
      return {
        totalHackathons: 0,
        totalImpressions: 0,
        totalRegistrations: 0,
        conversionRate: 0,
        avgRegistrationsPerHackathon: 0
      };
    }

    const overview = analyticsData.overview.metrics;
    return {
      totalHackathons: overview.totalHackathons || 0,
      totalImpressions: overview.totalImpressions || 0,
      totalRegistrations: overview.totalRegistrations || 0,
      conversionRate: overview.averageConversionRate || 0,
      avgRegistrationsPerHackathon: overview.totalHackathons > 0 
        ? Math.round(overview.totalRegistrations / overview.totalHackathons) 
        : 0
    };
  }, [analyticsData.overview]);

  // Refresh analytics data
  const handleRefresh = useCallback(async () => {
    try {
      setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));
      
      const [overviewResponse, engagementResponse, timeSeriesResponse] = await Promise.all([
        analyticsAPI.getOverview({ period: dateRange }),
        analyticsAPI.getStudentEngagement(),
        analyticsAPI.getTimeSeries({ period: dateRange })
      ]);
      
      setAnalyticsData({
        overview: overviewResponse.data.overview,
        studentEngagement: engagementResponse.data.studentEngagement,
        timeSeries: timeSeriesResponse.data.timeSeriesData,
        loading: false,
        error: null
      });
      
      toast.success('Analytics data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh analytics data:', error);
      setAnalyticsData(prev => ({
        ...prev,
        loading: false,
        error: error?.response?.data?.error || 'Failed to refresh analytics data'
      }));
      toast.error('Failed to refresh analytics data');
    }
  }, [dateRange]);

  const handleExportCSV = useCallback(() => {
    if (!processedAnalyticsData.registeredBySegment.length) {
      toast.error('No data available for export');
      return;
    }

    const csvData = processedAnalyticsData.registeredBySegment.map(segment => ({
      Segment: segment.name,
      Registered: segment.registered,
      'Not Registered': segment.notRegistered,
      'Registration Rate': `${((segment.registered / (segment.registered + segment.notRegistered)) * 100).toFixed(1)}%`
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `\"${row[header]}\"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hackathon_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Analytics data exported successfully');
  }, [processedAnalyticsData.registeredBySegment]);

  const filteredData = useMemo(() => {
    // Apply filters to real analytics data
    let filtered = processedAnalyticsData.registeredBySegment;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [processedAnalyticsData.registeredBySegment, searchTerm]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h2>
          <p className="text-gray-400">Comprehensive insights into hackathon engagement and participation</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={analyticsData.loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={analyticsData.loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Filter size={16} />
            Filters
            <ChevronDown className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={analyticsData.loading || !processedAnalyticsData.registeredBySegment.length}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search Segment</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search departments..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Team Size</label>
              <select
                value={teamSizeFilter}
                onChange={(e) => setTeamSizeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Team Sizes</option>
                <option value="1-2">1-2 Members</option>
                <option value="3-4">3-4 Members</option>
                <option value="5+">5+ Members</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Registration Status</label>
              <select
                value={registrationStatusFilter}
                onChange={(e) => setRegistrationStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="registered">Registered</option>
                <option value="not-registered">Not Registered</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {analyticsData.loading && (
        <div className="bg-white/5 backdrop-blur rounded-xl p-8 border border-gray-700">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></div>
            <span className="text-gray-300">Loading analytics data...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {analyticsData.error && (
        <div className="bg-red-500/20 backdrop-blur rounded-xl p-6 border border-red-500 flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-red-300 font-semibold">Failed to Load Analytics</h3>
            <p className="text-red-200 text-sm">{analyticsData.error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {/* Key Metrics */}
      {!analyticsData.loading && !analyticsData.error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Hackathons"
              value={metrics.totalHackathons}
              icon={Activity}
              color="blue"
            />
            <MetricCard
              title="Total Impressions"
              value={metrics.totalImpressions.toLocaleString()}
              icon={Eye}
              color="green"
            />
            <MetricCard
              title="Total Registrations"
              value={metrics.totalRegistrations.toLocaleString()}
              icon={UserCheck}
              color="purple"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${metrics.conversionRate}%`}
              icon={Target}
              color="orange"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Registration by Department */}
            <BarChart
              data={filteredData.map(segment => ({
                name: segment.name,
                value: segment.registered
              }))}
              title="Registered Students by Department"
            />

            {/* Category Performance Distribution */}
            <DonutChart
              data={processedAnalyticsData.teamSizeDistribution}
              title="Category Performance Distribution"
            />
          </div>

          {/* Registration Trends */}
          <BarChart
            data={processedAnalyticsData.registrationTrends}
            title="Registration Trends Over Time"
            className="lg:col-span-2"
          />
        </>
      )}

      {/* Detailed Comparison Table */}
      {!analyticsData.loading && !analyticsData.error && (
        <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Detailed Segment Analysis</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw size={14} />
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>

          {filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Department</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-medium">Registered</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-medium">Not Registered</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-medium">Total Students</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-medium">Registration Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((segment, idx) => {
                    const total = segment.registered + segment.notRegistered;
                    const rate = total > 0 ? ((segment.registered / total) * 100).toFixed(1) : '0';
                    return (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{segment.name}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-semibold">{segment.registered}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{segment.notRegistered}</td>
                        <td className="py-3 px-4 text-right text-white font-medium">{total}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${parseFloat(rate) > 50 ? 'text-green-400' : parseFloat(rate) > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Analytics Data Available</h3>
              <p className="text-gray-400">Analytics will appear here once you have hackathons with student registrations.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;
