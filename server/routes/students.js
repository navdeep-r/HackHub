const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const { auth, requireStudent } = require('../middleware/auth');

const router = express.Router();

// Get student profile
router.get('/profile', auth, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update student profile
router.put('/profile', auth, requireStudent, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('year').optional().isInt({ min: 1, max: 4 }).withMessage('Year must be between 1-4'),
  body('department').optional().notEmpty().withMessage('Department is required'),
  body('secondaryEmail').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('personalDescription').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, year, department, secondaryEmail, personalDescription } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (year) updates.year = year;
    if (department) updates.department = department;
    if (secondaryEmail) updates.secondaryEmail = secondaryEmail;
    if (personalDescription !== undefined) updates.personalDescription = personalDescription;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get student's registered hackathons
router.get('/registrations', auth, requireStudent, async (req, res) => {
  try {
    const hackathons = await Hackathon.find({
      'registeredStudents.student': req.user._id
    }).populate('createdBy', 'name department');

    res.json({ hackathons });
  } catch (error) {
    console.error('Registrations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Get student's viewed hackathons (for tracking new updates)
router.get('/viewed-hackathons', auth, requireStudent, async (req, res) => {
  try {
    const hackathons = await Hackathon.find({
      'impressionHistory.student': req.user._id
    }).select('_id title createdAt isHighlighted');

    res.json({ viewedHackathons: hackathons });
  } catch (error) {
    console.error('Viewed hackathons fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch viewed hackathons' });
  }
});

// Mark hackathon as viewed (remove from new highlights)
router.post('/mark-viewed/:hackathonId', auth, requireStudent, async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.hackathonId);
    
    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    // Check if student has already viewed this hackathon
    const alreadyViewed = hackathon.impressionHistory.some(
      impression => impression.student.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      await hackathon.incrementImpression(req.user._id);
    }

    res.json({ message: 'Hackathon marked as viewed' });
  } catch (error) {
    console.error('Mark viewed error:', error);
    res.status(500).json({ error: 'Failed to mark hackathon as viewed' });
  }
});

// Get student's registration status for a specific hackathon
router.get('/registration-status/:hackathonId', auth, requireStudent, async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.hackathonId);
    
    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    const registration = hackathon.registeredStudents.find(
      reg => reg.student.toString() === req.user._id.toString()
    );

    res.json({
      isRegistered: !!registration,
      registration: registration || null
    });
  } catch (error) {
    console.error('Registration status error:', error);
    res.status(500).json({ error: 'Failed to fetch registration status' });
  }
});

// Get student's engagement analytics
router.get('/analytics', auth, requireStudent, async (req, res) => {
  try {
    const totalHackathons = await Hackathon.countDocuments({ isActive: true });
    const viewedHackathons = await Hackathon.countDocuments({
      'impressionHistory.student': req.user._id
    });
    const registeredHackathons = await Hackathon.countDocuments({
      'registeredStudents.student': req.user._id
    });

    const analytics = {
      totalHackathons,
      viewedHackathons,
      registeredHackathons,
      viewPercentage: totalHackathons > 0 ? (viewedHackathons / totalHackathons * 100).toFixed(1) : 0,
      registrationRate: viewedHackathons > 0 ? (registeredHackathons / viewedHackathons * 100).toFixed(1) : 0
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
