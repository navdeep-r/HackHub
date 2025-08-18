const express = require('express');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const { auth, requireFaculty } = require('../middleware/auth');

const router = express.Router();

// Get analytics for a specific hackathon
router.get('/hackathon/:id', auth, requireFaculty, async (req, res) => {
  try {
    const hackathon = await Hackathon.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate('registeredStudents.student', 'name email registrationNumber department year')
      .populate('impressionHistory.student', 'name email department');

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    // Calculate engagement metrics
    const totalImpressions = hackathon.impressions;
    const totalRegistrations = hackathon.registrations;
    const conversionRate = totalImpressions > 0 ? (totalRegistrations / totalImpressions * 100).toFixed(2) : 0;

    // Calculate daily impressions for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyImpressions = [];
    const impressionHistory = hackathon.impressionHistory.filter(
      impression => impression.timestamp >= thirtyDaysAgo
    );

    // Group impressions by date
    const impressionsByDate = {};
    impressionHistory.forEach(impression => {
      const date = impression.timestamp.toISOString().split('T')[0];
      impressionsByDate[date] = (impressionsByDate[date] || 0) + 1;
    });

    // Fill in missing dates with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyImpressions.unshift({
        date: dateStr,
        impressions: impressionsByDate[dateStr] || 0
      });
    }

    // Department-wise registration breakdown
    const departmentStats = {};
    hackathon.registeredStudents.forEach(registration => {
      const dept = registration.student.department;
      departmentStats[dept] = (departmentStats[dept] || 0) + 1;
    });

    // Year-wise registration breakdown
    const yearStats = {};
    hackathon.registeredStudents.forEach(registration => {
      const year = registration.student.year;
      yearStats[year] = (yearStats[year] || 0) + 1;
    });

    const analytics = {
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        createdAt: hackathon.createdAt,
        registrationDeadline: hackathon.registrationDeadline,
        eventDate: hackathon.eventDate
      },
      metrics: {
        totalImpressions,
        totalRegistrations,
        conversionRate: parseFloat(conversionRate),
        daysUntilDeadline: Math.ceil((new Date(hackathon.registrationDeadline) - new Date()) / (1000 * 60 * 60 * 24)),
        daysUntilEvent: Math.ceil((new Date(hackathon.eventDate) - new Date()) / (1000 * 60 * 60 * 24))
      },
      dailyImpressions,
      departmentStats,
      yearStats,
      registeredStudents: hackathon.registeredStudents.map(reg => ({
        student: reg.student,
        registrationDate: reg.registrationDate,
        emailUsed: reg.emailUsed,
        confirmationStatus: reg.confirmationStatus
      }))
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Hackathon analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch hackathon analytics' });
  }
});

// Get overall analytics for faculty
router.get('/overview', auth, requireFaculty, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Get all hackathons by this faculty
    const hackathons = await Hackathon.find({
      createdBy: req.user._id,
      createdAt: { $gte: daysAgo }
    });

    // Calculate overall metrics
    const totalHackathons = hackathons.length;
    const totalImpressions = hackathons.reduce((sum, h) => sum + h.impressions, 0);
    const totalRegistrations = hackathons.reduce((sum, h) => sum + h.registrations, 0);
    const averageConversionRate = totalImpressions > 0 ? (totalRegistrations / totalImpressions * 100).toFixed(2) : 0;

    // Category-wise performance
    const categoryStats = {};
    hackathons.forEach(hackathon => {
      hackathon.tags.forEach(tag => {
        if (!categoryStats[tag]) {
          categoryStats[tag] = { hackathons: 0, impressions: 0, registrations: 0 };
        }
        categoryStats[tag].hackathons += 1;
        categoryStats[tag].impressions += hackathon.impressions;
        categoryStats[tag].registrations += hackathon.registrations;
      });
    });

    // Calculate conversion rates for categories
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.conversionRate = stats.impressions > 0 ? (stats.registrations / stats.impressions * 100).toFixed(2) : 0;
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentHackathons = hackathons.filter(h => h.createdAt >= sevenDaysAgo);
    const recentImpressions = recentHackathons.reduce((sum, h) => sum + h.impressions, 0);
    const recentRegistrations = recentHackathons.reduce((sum, h) => sum + h.registrations, 0);

    // Top performing hackathons
    const topHackathons = hackathons
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 5)
      .map(h => ({
        id: h._id,
        title: h.title,
        impressions: h.impressions,
        registrations: h.registrations,
        conversionRate: h.impressions > 0 ? (h.registrations / h.impressions * 100).toFixed(2) : 0
      }));

    const overview = {
      period: parseInt(period),
      metrics: {
        totalHackathons,
        totalImpressions,
        totalRegistrations,
        averageConversionRate: parseFloat(averageConversionRate),
        recentHackathons: recentHackathons.length,
        recentImpressions,
        recentRegistrations
      },
      categoryStats,
      topHackathons
    };

    res.json({ overview });
  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
});

// Get student engagement analytics
router.get('/student-engagement', auth, requireFaculty, async (req, res) => {
  try {
    const { hackathonId } = req.query;
    
    let query = { createdBy: req.user._id };
    if (hackathonId) {
      query._id = hackathonId;
    }

    const hackathons = await Hackathon.find(query)
      .populate('impressionHistory.student', 'name email department year')
      .populate('registeredStudents.student', 'name email department year');

    // Student engagement analysis
    const studentEngagement = {};
    
    hackathons.forEach(hackathon => {
      // Track impressions
      hackathon.impressionHistory.forEach(impression => {
        const studentId = impression.student._id.toString();
        if (!studentEngagement[studentId]) {
          studentEngagement[studentId] = {
            student: impression.student,
            totalImpressions: 0,
            totalRegistrations: 0,
            hackathonsViewed: new Set(),
            hackathonsRegistered: new Set()
          };
        }
        studentEngagement[studentId].totalImpressions += 1;
        studentEngagement[studentId].hackathonsViewed.add(hackathon._id.toString());
      });

      // Track registrations
      hackathon.registeredStudents.forEach(registration => {
        const studentId = registration.student._id.toString();
        if (!studentEngagement[studentId]) {
          studentEngagement[studentId] = {
            student: registration.student,
            totalImpressions: 0,
            totalRegistrations: 0,
            hackathonsViewed: new Set(),
            hackathonsRegistered: new Set()
          };
        }
        studentEngagement[studentId].totalRegistrations += 1;
        studentEngagement[studentId].hackathonsRegistered.add(hackathon._id.toString());
      });
    });

    // Convert to array and calculate additional metrics
    const engagementData = Object.values(studentEngagement).map(data => ({
      student: data.student,
      totalImpressions: data.totalImpressions,
      totalRegistrations: data.totalRegistrations,
      hackathonsViewed: data.hackathonsViewed.size,
      hackathonsRegistered: data.hackathonsRegistered.size,
      conversionRate: data.totalImpressions > 0 ? (data.totalRegistrations / data.totalImpressions * 100).toFixed(2) : 0
    }));

    // Sort by engagement level
    engagementData.sort((a, b) => b.totalRegistrations - a.totalRegistrations);

    res.json({ 
      studentEngagement: engagementData,
      totalStudents: engagementData.length
    });
  } catch (error) {
    console.error('Student engagement analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch student engagement analytics' });
  }
});

// Get time-based analytics
router.get('/time-series', auth, requireFaculty, async (req, res) => {
  try {
    const { hackathonId, period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    let query = { createdBy: req.user._id };
    if (hackathonId) {
      query._id = hackathonId;
    }

    const hackathons = await Hackathon.find(query);

    // Generate time series data
    const timeSeriesData = [];
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      let dailyImpressions = 0;
      let dailyRegistrations = 0;

      hackathons.forEach(hackathon => {
        // Count impressions for this date
        const impressionsForDate = hackathon.impressionHistory.filter(
          impression => impression.timestamp.toISOString().split('T')[0] === dateStr
        ).length;
        dailyImpressions += impressionsForDate;

        // Count registrations for this date
        const registrationsForDate = hackathon.registeredStudents.filter(
          registration => registration.registrationDate.toISOString().split('T')[0] === dateStr
        ).length;
        dailyRegistrations += registrationsForDate;
      });

      timeSeriesData.push({
        date: dateStr,
        impressions: dailyImpressions,
        registrations: dailyRegistrations
      });
    }

    res.json({ timeSeriesData });
  } catch (error) {
    console.error('Time series analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch time series analytics' });
  }
});

module.exports = router;
