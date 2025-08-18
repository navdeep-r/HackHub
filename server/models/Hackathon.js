const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  competitionLink: {
    type: String,
    required: true,
    trim: true
  },
  // Event timelines
  registrationDeadline: {
    type: Date,
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  // Categorization
  tags: [{
    type: String,
    enum: ['AI/ML', 'Web Dev', 'Mobile App', 'Blockchain', 'IoT', 'Cybersecurity', 'Data Science', 'Game Dev', 'Other'],
    required: true
  }],
  competitionType: {
    type: String,
    enum: ['paid', 'unpaid'],
    required: true
  },
  // Faculty information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Analytics tracking
  impressions: {
    type: Number,
    default: 0
  },
  registrations: {
    type: Number,
    default: 0
  },
  // Registration tracking
  registeredStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    emailUsed: {
      type: String,
      required: true
    },
    confirmationStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending'
    }
  }],
  // Impression tracking for analytics
  impressionHistory: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Status and visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  // Additional details
  prizePool: {
    type: String,
    default: ''
  },
  maxParticipants: {
    type: Number
  },
  requirements: {
    type: String,
    maxlength: 1000
  },
  // File attachments
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
hackathonSchema.index({ isActive: 1, eventDate: 1 });
hackathonSchema.index({ createdBy: 1 });
hackathonSchema.index({ tags: 1 });

// Method to increment impressions
hackathonSchema.methods.incrementImpression = function(studentId) {
  this.impressions += 1;
  this.impressionHistory.push({
    student: studentId,
    timestamp: new Date()
  });
  return this.save();
};

// Method to register a student
hackathonSchema.methods.registerStudent = function(studentId, emailUsed) {
  // Check if student is already registered
  const existingRegistration = this.registeredStudents.find(
    reg => reg.student.toString() === studentId.toString()
  );
  
  if (existingRegistration) {
    throw new Error('Student already registered for this hackathon');
  }
  
  this.registeredStudents.push({
    student: studentId,
    emailUsed: emailUsed
  });
  this.registrations += 1;
  return this.save();
};

// Method to confirm registration
hackathonSchema.methods.confirmRegistration = function(studentId) {
  const registration = this.registeredStudents.find(
    reg => reg.student.toString() === studentId.toString()
  );
  
  if (registration) {
    registration.confirmationStatus = 'confirmed';
    return this.save();
  }
  throw new Error('Registration not found');
};

// Virtual for checking if hackathon is upcoming
hackathonSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.eventDate;
});

// Virtual for checking if registration is still open
hackathonSchema.virtual('registrationOpen').get(function() {
  return new Date() < this.registrationDeadline;
});

module.exports = mongoose.model('Hackathon', hackathonSchema);
