const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  secondaryEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['faculty', 'student'],
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  // Student-specific fields
  year: {
    type: Number,
    required: function() { return this.role === 'student'; }
  },
  registrationNumber: {
    type: String,
    required: function() { return this.role === 'student'; },
    unique: true,
    sparse: true
  },
  personalDescription: {
    type: String,
    maxlength: 500
  },
  // Faculty-specific fields
  facultyId: {
    type: String,
    required: function() { return this.role === 'faculty'; },
    unique: true,
    sparse: true
  },
  
  // Common fields
  profilePicture: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Google OAuth for email monitoring (simplified)
  google: {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      description: 'Gmail address for monitoring'
    },
    accessToken: {
      type: String,
      description: 'Google access token'
    },
    refreshToken: {
      type: String,
      description: 'Google refresh token'
    },
    tokenExpiry: {
      type: Date,
      description: 'When the access token expires'
    },
    linkedAt: {
      type: Date,
      default: Date.now,
      description: 'When Gmail was first linked'
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  
  // Remove sensitive Google OAuth data but keep basic info
  if (userObject.google) {
    delete userObject.google.accessToken;
    delete userObject.google.refreshToken;
    delete userObject.google.tokenExpiry;
  }
  
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
