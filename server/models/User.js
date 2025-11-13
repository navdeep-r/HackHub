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
    required: function() {
      // Only require department for new documents, not updates
      return this.isNew;
    },
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
  try {
    if (!candidatePassword) {
      throw new Error('Password is required for comparison');
    }
    
    if (!this.password) {
      throw new Error('User password not found');
    }
    
    console.log('Comparing password for user:', this._id);
    const result = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password comparison result:', result);
    return result;
  } catch (error) {
    console.error('Password comparison error:', error);
    throw new Error('Password comparison failed');
  }
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  try {
    const userObject = this.toObject();
    delete userObject.password;
    
    console.log('Public profile generated for user:', userObject._id);
    return userObject;
  } catch (error) {
    console.error('Error generating public profile:', error);
    throw new Error('Failed to generate public profile');
  }
};

module.exports = mongoose.model('User', userSchema);