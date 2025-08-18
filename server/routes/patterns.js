const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// GET /api/patterns/platforms - Get list of supported platforms (simplified for testing)
router.get('/platforms', async (req, res) => {
  try {
    // Return a simple hardcoded list for testing
    const platforms = [
      {
        platform: 'devpost',
        displayName: 'Devpost',
        description: 'Devpost hackathon platform'
      },
      {
        platform: 'hackerearth',
        displayName: 'HackerEarth',
        description: 'HackerEarth coding platform'
      },
      {
        platform: 'hackerrank',
        displayName: 'HackerRank',
        description: 'HackerRank coding challenges'
      },
      {
        platform: 'mlh',
        displayName: 'Major League Hacking',
        description: 'MLH hackathon platform'
      }
    ];

    res.json({
      success: true,
      platforms: platforms
    });

  } catch (error) {
    console.error('Error getting supported platforms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/patterns - Get all platform patterns (simplified for testing)
router.get('/', auth, async (req, res) => {
  try {
    // Only faculty can view patterns
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty only.'
      });
    }

    // Return empty array for now since we're not using complex patterns
    res.json({
      success: true,
      patterns: []
    });

  } catch (error) {
    console.error('Error getting platform patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
