const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema(
  {
    // Core details
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      required: false,
      maxlength: 2000,
    },
    competitionLink: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) =>
          /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/([\w/_-]+))*\/?$/.test(v),
        message: (props) => `${props.value} is not a valid URL!`,
      },
    },

    // Event timeline
    registrationDeadline: {
      type: Date,
      required: true,
    },
    eventDate: {
      type: Date,
      required: false,
      validate: {
        validator: function (v) {
          // Only validate ordering when eventDate is provided
          if (!v || !this.registrationDeadline) return true;
          return v > this.registrationDeadline;
        },
        message: 'Event date must be after registration deadline',
      },
    },

    // Categorization
    tags: {
      type: [
        {
          type: String,
          enum: [
            'AI/ML',
            'Web Dev',
            'Mobile App',
            'Blockchain',
            'IoT',
            'Cybersecurity',
            'Data Science',
            'Game Dev',
            'Other',
          ],
        },
      ],
      required: false,
      validate: [
        (v) => v === undefined || (Array.isArray(v) && v.length > 0),
        'If provided, at least one tag is required',
      ],
    },
    competitionType: {
      type: String,
      enum: ['paid', 'unpaid'],
      required: false,
    },

    // Creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Analytics
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
    registrations: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Registered students
    registeredStudents: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        registrationDate: {
          type: Date,
          default: Date.now,
        },
        emailUsed: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
          match: [
            /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/,
            'Invalid email format',
          ],
        },
        confirmationStatus: {
          type: String,
          enum: ['pending', 'confirmed', 'failed'],
          default: 'pending',
        },
        platform: {
          type: String,
          enum: [
            'unstop',
            'dorahacks',
            'devpost',
            'hackerearth',
            'hackerrank',
            'topcoder',
            'codeforces',
            'leetcode',
            'kaggle',
            'mlh',
            'custom',
          ],
          default: 'unstop',
        },
        confirmedAt: Date,
        confirmationChecks: {
          type: Number,
          default: 0,
          min: 0,
        },
        lastCheckedAt: Date,
        confirmationEmail: {
          id: String,
          subject: String,
          from: String,
          date: Date,
          snippet: String,
        },
      },
    ],

    // Impression tracking
    impressionHistory: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status and visibility
    isActive: {
      type: Boolean,
      default: true,
    },
    isHighlighted: {
      type: Boolean,
      default: false,
    },

    // Additional details
    prizePool: {
      type: String,
      default: '',
    },
    maxParticipants: {
      type: Number,
      min: 1,
    },
    requirements: {
      type: String,
      maxlength: 1000,
    },

    // File attachments
    attachments: [
      {
        filename: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
          validate: {
            validator: (v) =>
              !v || /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/([\w/_-]+))*\/?$/.test(v),
            message: 'Invalid file URL format',
          },
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// 🔍 Indexes for performance
hackathonSchema.index({ isActive: 1, eventDate: 1 });
hackathonSchema.index({ tags: 1 });
hackathonSchema.index({ 'registeredStudents.student': 1 });
// Text index for full-text search on title and description only.
// Do NOT include `tags` here as a text index field — tags are indexed separately above
// and including an array field in this compound text index can cause MongoDB to throw
// "Field 'tags' of text index contains an array in document" when inserting documents.
hackathonSchema.index({ title: 'text', description: 'text' });

// 📈 Methods
hackathonSchema.methods.incrementImpression = async function (studentId) {
  this.impressions += 1;
  this.impressionHistory.push({ student: studentId, timestamp: new Date() });
  return this.save();
};

hackathonSchema.methods.registerStudent = async function (studentId, emailUsed) {
  const existing = this.registeredStudents.find(
    (r) => r.student.toString() === studentId.toString()
  );
  if (existing) {
    throw new Error('Student already registered for this hackathon');
  }

  this.registeredStudents.push({ student: studentId, emailUsed });
  await this.save();
  return this;
};

hackathonSchema.methods.confirmRegistration = async function (studentId) {
  const registration = this.registeredStudents.find(
    (r) => r.student.toString() === studentId.toString()
  );
  if (!registration) throw new Error('Registration not found');

  registration.confirmationStatus = 'confirmed';
  registration.confirmedAt = new Date();
  this.registrations = (this.registrations || 0) + 1;
  return this.save();
};

// 🧩 Virtuals
hackathonSchema.virtual('isUpcoming').get(function () {
  return this.eventDate > new Date();
});

hackathonSchema.virtual('registrationOpen').get(function () {
  return this.registrationDeadline > new Date();
});

// 🧹 Pre-save cleanup (optional)
hackathonSchema.pre('save', function (next) {
  this.title = this.title?.trim();
  if (this.description) this.description = this.description.trim();
  next();
});

module.exports = mongoose.model('Hackathon', hackathonSchema);
