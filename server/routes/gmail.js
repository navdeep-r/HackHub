const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const googleAuthService = require('../services/googleAuth');
const User = require('../models/User');

// GET /api/gmail/auth-url - Get Google OAuth URL for linking Gmail
router.get('/auth-url', auth, async (req, res) => {
  try {
    const url = googleAuthService.generateAuthUrl();
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate auth URL' });
  }
});

// POST /api/gmail/link - Link Gmail account (simplified for testing)
router.post('/link', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    // Exchange code for tokens
    const tokens = await googleAuthService.getTokensFromCode(code);
    
    // Get user's Gmail profile
    const gmailProfile = await googleAuthService.getGmailProfile(tokens.access_token);

    // Update user with Google OAuth data (simplified)
    await User.findByIdAndUpdate(userId, {
      'google.email': gmailProfile.emailAddress,
      'google.accessToken': tokens.access_token,
      'google.refreshToken': tokens.refresh_token,
      'google.tokenExpiry': tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      'google.linkedAt': new Date()
    });

    res.json({
      success: true,
      message: 'Gmail account linked successfully',
      gmailEmail: gmailProfile.emailAddress
    });

  } catch (error) {
    console.error('Error linking Gmail account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link Gmail account',
      error: error.message
    });
  }
});

// POST /api/gmail/unlink - Unlink Gmail account
router.post('/unlink', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove Google OAuth data
    await User.findByIdAndUpdate(userId, {
      $unset: {
        'google': 1
      }
    });

    res.json({
      success: true,
      message: 'Gmail account unlinked successfully'
    });

  } catch (error) {
    console.error('Error unlinking Gmail account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink Gmail account',
      error: error.message
    });
  }
});

// GET /api/gmail/status - Get Gmail connection status
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user?.google) {
      return res.json({
        success: true,
        linked: false,
        message: 'Gmail not linked'
      });
    }

    res.json({
      success: true,
      linked: true,
      gmailEmail: user.google.email,
      linkedAt: user.google.linkedAt
    });

  } catch (error) {
    console.error('Error getting Gmail status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Gmail status',
      error: error.message
    });
  }
});

module.exports = router;
