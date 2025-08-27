const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, requireAnyRole } = require('../middleware/auth');
const googleAuthService = require('../services/googleAuth');

const router = express.Router();

// Generate JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_key';
const generateToken = (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for token generation');
    }
    
    console.log('Generating token for user ID:', userId);
    console.log('JWT_SECRET exists:', !!JWT_SECRET);
    
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Token generated successfully');
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// Register new user
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['faculty', 'student']).withMessage('Role must be faculty or student'),
  body('department').optional().notEmpty().withMessage('Department is required'),
  // Student-specific validation
  body('year').if(body('role').equals('student')).isInt({ min: 1, max: 4 }).withMessage('Year must be between 1-4'),
  body('registrationNumber').if(body('role').equals('student')).notEmpty().withMessage('Registration number is required for students'),
  body('facultyId').if(body('role').equals('faculty')).notEmpty().withMessage('Faculty ID is required for faculty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, department, year, registrationNumber, facultyId, secondaryEmail, personalDescription } = req.body;

    console.log("Raw email:", req.body.email);
    console.log("After validation:", email);
    console.log("Registration number:", registrationNumber);
    console.log("Faculty ID:", facultyId);

    console.log("Mongo query:", {
      $or: [{ email }, { registrationNumber }, { facultyId }].filter(Boolean)
    });

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { registrationNumber }, { facultyId }].filter(Boolean)
    });

    if (existingUser) {
      console.log({ name, email, password, role, department, year, registrationNumber, facultyId, secondaryEmail, personalDescription }, existingUser)
      return res.status(400).json({ error: 'User already exists with this email, registration number, or faculty ID' });
    }

    // Create user object based on role
    const userData = {
      name,
      email,
      password,
      role,
      department: department || 'General', // Provide default if missing
      secondaryEmail,
      personalDescription
    };

    if (role === 'student') {
      userData.year = year;
      userData.registrationNumber = registrationNumber;
    } else {
      userData.facultyId = facultyId;
    }

    const user = new User(userData);
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('Login attempt started for:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Validated email:', email);

    // Find user by email
    console.log('Finding user in database...');
    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      console.log('User account is inactive');
      return res.status(401).json({ error: 'Account inactive' });
    }

    // Check password
    console.log('Checking password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    console.log('Updating last login...');
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Generate token
    console.log('Generating JWT token...');
    const token = generateToken(user._id);
    console.log('Token generated successfully');

    // Get public profile
    console.log('Getting public profile...');
    const publicProfile = user.getPublicProfile();
    console.log('Public profile generated successfully');

    console.log('Login successful for user:', user._id);
    res.json({
      message: 'Login successful',
      token,
      user: publicProfile
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user profile
router.get('/profile', auth, requireAnyRole, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile()
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', auth, requireAnyRole, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('secondaryEmail').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('personalDescription').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, secondaryEmail, personalDescription } = req.body;
    const updates = {};

    if (name) updates.name = name;
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


router.get('/google/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  if (!code) {
    return res.status(400).send('No code provided');
  }


  try {
    const { access_token, refresh_token, expiry_date } = await googleAuthService.getTokensFromCode(code);

    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: 'Access token and refresh token are required' });
    }

    console.log(
      await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'google.accessToken': access_token,
            'google.refreshToken': refresh_token,
            'google.tokenExpiry': expiry_date ? new Date(expiry_date) : null,
            'google.linkedAt': new Date()
          }
        },
        { new: true } // return updated doc instead of old one
      )
    );
    res.redirect("http://localhost:3000/auth/google/callback");
  } catch (error) {
    console.error('Google tokens storage error:', error);
    res.status(500).json({ error: 'Failed to store Google tokens' });
  }

  // try {
  //   const { tokens } = await oauth2Client.getToken(code);
  //   console.log('Tokens:', tokens);

  //   // TODO: save tokens in DB with userId
  //   // e.g. await User.findByIdAndUpdate(userId, { googleTokens: tokens });

  //   // Redirect user back to frontend after success
  //   res.redirect('http://localhost:3000/registration-confirmation?success=true');
  // } catch (err) {
  //   console.error('Token exchange error:', err);
  //   res.redirect('http://localhost:3000/registration-confirmation?success=false');
  // }
});


// Google OAuth token storage (for email monitoring)
// router.post('/google-tokens', auth, requireAnyRole, async (req, res) => {
//   try {
//     const { accessToken, refreshToken, expiry } = req.body;

//     if (!accessToken || !refreshToken) {
//       return res.status(400).json({ error: 'Access token and refresh token are required' });
//     }

//     await User.findByIdAndUpdate(req.user._id, {
//       googleAccessToken: accessToken,
//       googleRefreshToken: refreshToken,
//       googleTokenExpiry: expiry ? new Date(expiry) : null
//     });

//     res.json({ message: 'Google tokens stored successfully' });
//   } catch (error) {
//     console.error('Google tokens storage error:', error);
//     res.status(500).json({ error: 'Failed to store Google tokens' });
//   }
// });

// Debug endpoint to check monitoring status
router.get('/debug/monitoring', auth, async (req, res) => {
  try {
    const activeMonitoring = googleAuthService.getActiveMonitoring();
    res.json({
      activeMonitoringSessions: Array.from(activeMonitoring.keys()),
      totalActiveSessions: activeMonitoring.size,
      details: Object.fromEntries(
        Array.from(activeMonitoring.entries()).map(([key, data]) => [
          key,
          {
            startTime: data.startTime,
            timeoutId: !!data.timeoutId,
            intervalId: !!data.intervalId
          }
        ])
      )
    });
  } catch (error) {
    console.error('Debug monitoring error:', error);
    res.status(500).json({ error: 'Failed to get monitoring status' });
  }
});

module.exports = router;

// Dev-only quick login endpoint
// POST /api/auth/dev-login { role: 'faculty' | 'student', email?: string }
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', async (req, res) => {
    try {
      const { role = 'faculty', email } = req.body || {};
      if (!['faculty', 'student'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const userEmail = email || (role === 'faculty' ? 'faculty@college.edu' : 'student@college.edu');

      let user = await User.findOne({ email: userEmail });
      if (!user) {
        const base = {
          name: role === 'faculty' ? 'Dr. Faculty User' : 'Student User',
          email: userEmail,
          password: 'password',
          role,
          department: 'Computer Science'
        };

        if (role === 'faculty') {
          user = new User({ ...base, facultyId: 'FAC123' });
        } else {
          user = new User({ ...base, year: 3, registrationNumber: 'REG123' });
        }

        await user.save();
      }

      const token = generateToken(user._id);
      return res.json({ message: 'Dev login successful', token, user: user.getPublicProfile() });
    } catch (error) {
      console.error('Dev login error:', error);
      return res.status(500).json({ error: 'Dev login failed' });
    }
  });
}