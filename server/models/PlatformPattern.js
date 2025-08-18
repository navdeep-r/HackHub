const mongoose = require('mongoose');

const platformPatternSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    unique: true,
    enum: ['unstop', 'dorahacks', 'devpost', 'hackerearth', 'hackerrank', 'topcoder', 'codeforces', 'leetcode', 'kaggle', 'mlh', 'custom'],
    index: true
  },
  displayName: {
    type: String,
    required: true,
    description: 'Human-readable platform name'
  },
  description: {
    type: String,
    description: 'Platform description and notes'
  },
  senderDomains: [{
    type: String,
    required: true,
    description: 'Email domains that send confirmation emails'
  }],
  subjectTokens: [{
    type: String,
    description: 'Keywords that must appear in email subject'
  }],
  bodyTokens: [{
    type: String,
    description: 'Keywords that must appear in email body (optional)'
  }],
  headers: {
    type: Map,
    of: String,
    description: 'Optional header patterns for additional matching'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 80,
    description: 'Confidence score for this pattern (0-100)'
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    description: 'Priority for pattern matching (higher = checked first)'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'User who last updated this pattern'
  },
  testResults: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    testEmail: {
      from: String,
      subject: String,
      body: String
    },
    matched: Boolean,
    confidence: Number,
    notes: String
  }],
  metadata: {
    website: String,
    apiEndpoint: String,
    supportEmail: String,
    documentation: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
platformPatternSchema.index({ platform: 1, enabled: 1 });
platformPatternSchema.index({ priority: -1, enabled: 1 });
platformPatternSchema.index({ 'senderDomains': 1 });

// Pre-save middleware to update lastUpdated
platformPatternSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Instance method to test pattern against email data
platformPatternSchema.methods.testMatch = function(emailData) {
  const { from, subject, body = '', headers = {} } = emailData;
  let score = 0;
  let maxScore = 100;
  const reasons = [];

  // Check sender domain (40 points)
  const fromLower = from.toLowerCase();
  const domainMatch = this.senderDomains.some(domain => 
    fromLower.includes(domain.toLowerCase())
  );
  
  if (domainMatch) {
    score += 40;
    reasons.push('Sender domain matches');
  } else {
    reasons.push('Sender domain does not match');
    return { matched: false, score: 0, reasons, confidence: 0 };
  }

  // Check subject tokens (30 points)
  if (this.subjectTokens && this.subjectTokens.length > 0) {
    const subjectLower = subject.toLowerCase();
    const subjectMatch = this.subjectTokens.some(token => 
      subjectLower.includes(token.toLowerCase())
    );
    
    if (subjectMatch) {
      score += 30;
      reasons.push('Subject contains required tokens');
    } else {
      reasons.push('Subject missing required tokens');
      maxScore -= 30;
    }
  }

  // Check body tokens (20 points)
  if (this.bodyTokens && this.bodyTokens.length > 0) {
    const bodyLower = body.toLowerCase();
    const bodyMatch = this.bodyTokens.some(token => 
      bodyLower.includes(token.toLowerCase())
    );
    
    if (bodyMatch) {
      score += 20;
      reasons.push('Body contains required tokens');
    } else {
      reasons.push('Body missing required tokens');
      maxScore -= 20;
    }
  }

  // Check header patterns (10 points)
  if (this.headers && Object.keys(this.headers).length > 0) {
    let headerScore = 0;
    const headerMax = 10;
    
    for (const [headerName, expectedValue] of this.headers) {
      const actualValue = headers[headerName];
      if (actualValue && actualValue.toLowerCase().includes(expectedValue.toLowerCase())) {
        headerScore += headerMax / Object.keys(this.headers).length;
      }
    }
    
    score += headerScore;
    if (headerScore > 0) {
      reasons.push('Headers match patterns');
    }
  }

  // Calculate final confidence
  const confidence = Math.round((score / maxScore) * 100);
  const matched = confidence >= this.confidence;

  return {
    matched,
    score,
    maxScore,
    confidence,
    reasons
  };
};

// Instance method to add test result
platformPatternSchema.methods.addTestResult = function(testEmail, matched, confidence, notes) {
  this.testResults.push({
    testEmail,
    matched,
    confidence,
    notes
  });
  
  // Keep only last 10 test results
  if (this.testResults.length > 10) {
    this.testResults = this.testResults.slice(-10);
  }
  
  return this.save();
};

// Static method to find patterns by domain
platformPatternSchema.statics.findByDomain = function(domain) {
  return this.find({
    enabled: true,
    senderDomains: { $regex: domain, $options: 'i' }
  }).sort({ priority: -1, confidence: -1 });
};

// Static method to get all enabled patterns
platformPatternSchema.statics.getEnabledPatterns = function() {
  return this.find({ enabled: true }).sort({ priority: -1, confidence: -1 });
};

// Static method to create default patterns
platformPatternSchema.statics.createDefaultPatterns = async function() {
  const defaultPatterns = [
    {
      platform: 'unstop',
      displayName: 'Unstop',
      description: 'Unstop hackathon platform confirmation emails',
      senderDomains: ['unstop.com', 'mail.unstop.com', 'noreply.unstop.com'],
      subjectTokens: ['registration', 'confirmed', 'you are registered', 'successfully registered'],
      bodyTokens: ['thank you for registering', 'successfully registered', 'registration confirmed'],
      confidence: 90,
      priority: 1
    },
    {
      platform: 'dorahacks',
      displayName: 'DoraHacks',
      description: 'DoraHacks hackathon platform confirmation emails',
      senderDomains: ['dorahacks.com', 'mail.dorahacks.com', 'noreply.dorahacks.com'],
      subjectTokens: ['registration', 'confirmed', 'registered', 'success'],
      bodyTokens: ['registration successful', 'welcome to', 'you have been registered'],
      confidence: 90,
      priority: 1
    },
    {
      platform: 'devpost',
      displayName: 'Devpost',
      description: 'Devpost hackathon platform confirmation emails',
      senderDomains: ['devpost.com', 'mail.devpost.com', 'noreply.devpost.com'],
      subjectTokens: ['registration', 'confirmed', 'registered', 'welcome'],
      bodyTokens: ['registration confirmed', 'welcome to the hackathon', 'successfully registered'],
      confidence: 85,
      priority: 1
    },
    {
      platform: 'hackerearth',
      displayName: 'HackerEarth',
      description: 'HackerEarth hackathon platform confirmation emails',
      senderDomains: ['hackerearth.com', 'mail.hackerearth.com', 'noreply.hackerearth.com'],
      subjectTokens: ['registration', 'confirmed', 'registered', 'success'],
      bodyTokens: ['registration successful', 'welcome to', 'you are now registered'],
      confidence: 85,
      priority: 2
    },
    {
      platform: 'mlh',
      displayName: 'Major League Hacking',
      description: 'MLH hackathon platform confirmation emails',
      senderDomains: ['mlh.io', 'mail.mlh.io', 'noreply.mlh.io'],
      subjectTokens: ['registration', 'confirmed', 'registered', 'welcome'],
      bodyTokens: ['registration confirmed', 'welcome to', 'successfully registered'],
      confidence: 90,
      priority: 1
    }
  ];

  for (const pattern of defaultPatterns) {
    const exists = await this.findOne({ platform: pattern.platform });
    if (!exists) {
      await this.create(pattern);
    }
  }
};

const PlatformPattern = mongoose.model('PlatformPattern', platformPatternSchema);

module.exports = PlatformPattern;
