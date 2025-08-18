const mongoose = require('mongoose');

const pendingVerificationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hackathon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: true,
    index: true
  },
  emailAddress: {
    type: String,
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['unstop', 'dorahacks', 'devpost', 'hackerearth', 'hackerrank', 'topcoder', 'codeforces', 'leetcode', 'kaggle', 'mlh', 'custom'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'timeout', 'failed', 'manual'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastHistoryId: {
    type: String,
    description: 'Gmail History checkpoint for this verification'
  },
  matchedMessageId: {
    type: String,
    description: 'Gmail message ID when confirmed'
  },
  evidence: {
    from: String,
    subject: String,
    snippet: String,
    date: String,
    messageId: String
  },
  errorLog: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    code: String,
    note: String,
    details: mongoose.Schema.Types.Mixed
  }],
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  manualProof: {
    uploadedAt: Date,
    fileUrl: String,
    fileType: String,
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
pendingVerificationSchema.index({ student: 1, hackathon: 1, status: 1 });
pendingVerificationSchema.index({ platform: 1, status: 1, createdAt: 1 });
pendingVerificationSchema.index({ expiresAt: 1, status: 1 });

// TTL index to automatically clean up expired verifications
pendingVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiresAt if not provided
pendingVerificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Default expiration: 7 days from creation
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Instance method to add error to log
pendingVerificationSchema.methods.addError = function(code, note, details = null) {
  this.errorLog.push({
    code,
    note,
    details
  });
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as confirmed
pendingVerificationSchema.methods.confirm = function(evidence) {
  this.status = 'confirmed';
  this.evidence = evidence;
  this.matchedMessageId = evidence.messageId;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as timeout
pendingVerificationSchema.methods.timeout = function() {
  this.status = 'timeout';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
pendingVerificationSchema.methods.fail = function(code, note, details = null) {
  this.status = 'failed';
  this.addError(code, note, details);
  return this.save();
};

// Static method to find pending verifications for a user
pendingVerificationSchema.statics.findPendingForUser = function(userId) {
  return this.find({
    student: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('hackathon', 'name startDate endDate');
};

// Static method to find verifications by platform and status
pendingVerificationSchema.statics.findByPlatformAndStatus = function(platform, status) {
  return this.find({ platform, status });
};

// Static method to get verification statistics
pendingVerificationSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        platforms: { $addToSet: '$platform' }
      }
    }
  ]);
};

const PendingVerification = mongoose.model('PendingVerification', pendingVerificationSchema);

module.exports = PendingVerification;
