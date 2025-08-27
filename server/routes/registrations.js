const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Hackathon = require('../models/Hackathon');

// POST /api/registrations/start - Start registration process (simplified for testing)
router.post('/start', auth, async (req, res) => {
  try {
    const { hackathonId, emailUsed } = req.body;
    const studentId = req.user.id;

    if (!hackathonId || !emailUsed) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: hackathonId, emailUsed'
      });
    }

    // Check if hackathon exists
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    // Check if already registered
    const existingRegistration = hackathon.registeredStudents.find(
      reg => reg.student.toString() === studentId.toString()
    );

    if (existingRegistration) {
      return res.status(409).json({
        success: false,
        message: 'Already registered for this hackathon',
        registration: existingRegistration
      });
    }

    // Add student to hackathon registrations
    hackathon.registeredStudents.push({
      student: studentId,
      emailUsed: emailUsed,
      registrationDate: new Date(),
      confirmationStatus: 'pending'
    });

    await hackathon.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      registration: {
        hackathonId: hackathon._id,
        hackathonTitle: hackathon.title,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error starting registration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/registrations/:hackathonId/status - Check registration status
router.get('/:hackathonId/status', auth, async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.user.id;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({
        success: false,
        message: 'Hackathon not found'
      });
    }

    const registration = hackathon.registeredStudents.find(
      reg => reg.student.toString() === userId.toString()
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Not registered for this hackathon'
      });
    }

    res.json({
      success: true,
      registration: {
        hackathonId: hackathon._id,
        hackathonName: hackathon.name,
        status: registration.confirmationStatus,
        registrationDate: registration.registrationDate,
        emailUsed: registration.emailUsed
      }
    });

  } catch (error) {
    console.error('Error getting registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
