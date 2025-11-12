const express = require('express');
const { body, validationResult } = require('express-validator');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const { auth, requireFaculty, requireStudent } = require('../middleware/auth');
const googleAuthService = require('../services/googleAuth');

const router = express.Router();

// Create new hackathon (Faculty only)
router.post('/', auth, requireFaculty, [
  // Only require title, competitionLink and registrationDeadline per request
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5-100 characters'),
  body('competitionLink').isURL().withMessage('Valid competition link is required'),
  body('registrationDeadline').isISO8601().withMessage('Valid registration deadline is required'),
  // Optional fields (validated if present)
  body('description').optional().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10-2000 characters'),
  body('eventDate').optional().isISO8601().withMessage('Valid event date is required'),
  body('tags').optional().isArray({ min: 1 }).withMessage('At least one tag is required if provided'),
  body('competitionType').optional().isIn(['paid', 'unpaid']).withMessage('Competition type must be paid or unpaid'),
  body('prizePool').optional().isString(),
  body('maxParticipants').optional().isInt({ min: 1 }),
  body('requirements').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, description, competitionLink, registrationDeadline, eventDate,
      tags, competitionType, prizePool, maxParticipants, requirements
    } = req.body;

    // Validate registration deadline (required)
    const regDeadline = new Date(registrationDeadline);
    const now = new Date();
    if (isNaN(regDeadline.getTime())) {
      return res.status(400).json({ error: 'Invalid registration deadline' });
    }
    if (regDeadline <= now) {
      return res.status(400).json({ error: 'Registration deadline must be in the future' });
    }

    // If eventDate provided, validate ordering
    let event;
    if (eventDate) {
      event = new Date(eventDate);
      if (isNaN(event.getTime())) {
        return res.status(400).json({ error: 'Invalid event date' });
      }
      if (event <= regDeadline) {
        return res.status(400).json({ error: 'Event date must be after registration deadline' });
      }
    }

    const hackathon = new Hackathon({
      title,
      description: description || undefined,
      competitionLink,
      registrationDeadline: regDeadline,
      eventDate: event || undefined,
      tags: tags || undefined,
      competitionType: competitionType || undefined,
      createdBy: req.user._id,
      prizePool: prizePool || '',
      maxParticipants: maxParticipants || undefined,
      requirements: requirements || undefined
    });
    // Log the payload about to be saved for debugging
    console.log('[CreateHackathon] payload:', {
      title,
      competitionLink,
      registrationDeadline: regDeadline,
      eventDate: event,
      tags,
      competitionType,
      prizePool,
      maxParticipants,
      requirements,
      createdBy: req.user._id
    });

    try {
      await hackathon.save();
      res.status(201).json({
        message: 'Hackathon created successfully',
        hackathon
      });
    } catch (saveErr) {
      console.error('Hackathon save error:', saveErr);
      // Mongoose validation error -> return 422 with details
      if (saveErr.name === 'ValidationError') {
        const errors = Object.keys(saveErr.errors).map(key => ({
          field: key,
          message: saveErr.errors[key].message
        }));
        return res.status(422).json({ error: 'Validation failed', errors });
      }
      // Unknown error -> propagate as 500
      return res.status(500).json({ error: 'Failed to create hackathon', details: saveErr.message });
    }
  } catch (error) {
    console.error('Hackathon creation error:', error);
    res.status(500).json({ error: 'Failed to create hackathon' });
  }
});

// Get all hackathons (Faculty view with analytics)
router.get('/', auth, requireFaculty, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

  // NOTE: faculty should be able to view all hackathons across the platform.
  // Keep filters for status only.
  let query = {};
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const hackathons = await Hackathon.find(query)
      .populate('registeredStudents.student', 'name email registrationNumber department year')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Hackathon.countDocuments(query);

    res.json({
      hackathons,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalHackathons: total
      }
    });
  } catch (error) {
    console.error('Hackathon fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch hackathons' });
  }
});

// Get hackathons for students (authenticated view)
router.get('/student', auth, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 10, tags, type } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    if (type) query.competitionType = type;

    const hackathons = await Hackathon.find(query)
      .populate('createdBy', 'name department')
      .sort({ isHighlighted: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Hackathon.countDocuments(query);

    res.json({
      hackathons,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalHackathons: total
      }
    });
  } catch (error) {
    console.error('Student hackathon fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch hackathons' });
  }
});

// Get single hackathon with analytics
router.get('/:id', auth, requireFaculty, async (req, res) => {
  try {
    // Allow faculty to fetch any hackathon details for analytics purposes
    const hackathon = await Hackathon.findById(req.params.id)
      .populate('registeredStudents.student', 'name email registrationNumber department year');

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    res.json({ hackathon });
  } catch (error) {
    console.error('Hackathon fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch hackathon' });
  }
});

// Get hackathon details for students (with impression tracking)
router.get('/student/:id', auth, requireStudent, async (req, res) => {
  try {
    const hackathon = await Hackathon.findOne({
      _id: req.params.id,
      isActive: true
    }).populate('createdBy', 'name department');

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    // Increment impression
    await hackathon.incrementImpression(req.user._id);

    res.json({ hackathon });
  } catch (error) {
    console.error('Student hackathon view error:', error);
    res.status(500).json({ error: 'Failed to fetch hackathon' });
  }
});

// Update hackathon
router.put('/:id', auth, requireFaculty, [
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('description').optional().isLength({ min: 20, max: 2000 }),
  body('competitionLink').optional().isURL(),
  body('registrationDeadline').optional().isISO8601(),
  body('eventDate').optional().isISO8601(),
  body('tags').optional().isArray({ min: 1 }),
  body('competitionType').optional().isIn(['paid', 'unpaid']),
  body('isActive').optional().isBoolean(),
  body('isHighlighted').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hackathon = await Hackathon.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        hackathon[key] = req.body[key];
      }
    });

    await hackathon.save();

    res.json({
      message: 'Hackathon updated successfully',
      hackathon
    });
  } catch (error) {
    console.error('Hackathon update error:', error);
    res.status(500).json({ error: 'Failed to update hackathon' });
  }
});

// Delete hackathon
router.delete('/:id', auth, requireFaculty, async (req, res) => {
  try {
    console.log(`[DeleteRoute] incoming DELETE /api/hackathons/${req.params.id} by user ${req.user?._id}`);
    // First fetch the hackathon to give clearer errors when it exists
    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    // Only allow the creator to delete the hackathon. If someone else (even faculty)
    // attempts deletion, return 403 so the client can explain it's a permission issue.
    if (hackathon.createdBy.toString() !== req.user._id.toString()) {
      console.warn(`Delete denied: user ${req.user._id} attempted to delete hackathon ${req.params.id} created by ${hackathon.createdBy}`);
      return res.status(403).json({ error: 'You are not authorized to delete this hackathon' });
    }

    await Hackathon.findByIdAndDelete(req.params.id);

    res.json({ message: 'Hackathon deleted successfully' });
  } catch (error) {
    console.error('Hackathon deletion error:', error);
    res.status(500).json({ error: 'Failed to delete hackathon' });
  }
});

// Register for hackathon (Student)
router.post('/:id/register', auth, requireStudent, [
  body('emailUsed').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { emailUsed } = req.body;
    const hackathon = await Hackathon.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }

    // Check if registration is still open
    if (new Date() > hackathon.registrationDeadline) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // Check if student is already registered
    const existingRegistration = hackathon.registeredStudents.find(
      reg => reg.student.toString() === req.user._id.toString() && reg.confirmationStatus === "confirmed"
    );

    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this hackathon' });
    }

    // Register student
    await hackathon.registerStudent(req.user._id, emailUsed);

    // Start background monitoring for unstop confirmations (12 hours window)
    let monitoringStarted = false;
    let gmailLinked = Boolean(req.user.google && req.user.google.accessToken);
    let gmailAuthUrl;
    try {
      if (gmailLinked) {
        await googleAuthService.startMonitoring(req.user._id, hackathon._id, emailUsed, {
          intervalMinutes: 1,
          totalWindowHours: 1,
          allowedDomains: ['emails.unstop.com'],
          subjectRegex: /.*(registration|confirmed|success|welcome|you are registered|registration successful).*/i
        });
        // await googleAuthService.startMonitoring(req.user._id, hackathon._id, emailUsed, {
        //   intervalMinutes: 1,
        //   totalWindowHours: 1 / 20,
        //   allowedDomains: ['unstop.com'],
        //   subjectRegex: /(registration|confirmed|success|welcome|you are registered|registration successful)/i
        // });
        monitoringStarted = true;
      } else {
        // console.log("User: ", req.user);
        gmailAuthUrl = googleAuthService.generateAuthUrl(req.user._id);
      }
    } catch (monitorErr) {
      console.error('Failed to start email monitoring:', monitorErr.message);
    }

    res.json({
      message: 'Successfully registered for hackathon',
      hackathon: {
        id: hackathon._id,
        title: hackathon.title,
        registrations: hackathon.registrations
      },
      monitoringStarted,
      gmailLinked,
      gmailAuthUrl
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register for hackathon' });
  }
});

// Unregister student from hackathon (Student)
router.post('/:id/unregister', auth, requireStudent, async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) return res.status(404).json({ error: 'Hackathon not found' });

    const idx = hackathon.registeredStudents.findIndex(
      reg => reg.student.toString() === req.user._id.toString()
    );

    if (idx === -1) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const wasConfirmed = hackathon.registeredStudents[idx].confirmationStatus === 'confirmed';

    // Remove registration
    hackathon.registeredStudents.splice(idx, 1);

    // Decrement confirmed registrations count only if it was previously confirmed
    if (wasConfirmed && hackathon.registrations > 0) {
      hackathon.registrations = Math.max(0, hackathon.registrations - 1);
    }

    await hackathon.save();

    res.json({ message: 'Unregistered successfully' });
  } catch (error) {
    console.error('Unregister error:', error);
    res.status(500).json({ error: 'Failed to unregister' });
  }
});

module.exports = router;
