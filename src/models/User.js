const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  picture: {
    type: String,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  profile: {
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    github: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ''
    },
    education: {
      type: String,
      trim: true,
      maxlength: 150,
      default: ''
    },
    interests: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    careerGoal: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    }
  },
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 50,
      default: 0
    }
  }],
  preferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship']
    }],
    experienceLevels: [{
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive']
    }],
    remotePreference: {
      type: String,
      enum: ['fully-remote', 'hybrid', 'office-based', 'any'],
      default: 'any'
    },
    preferredLocations: [{
      type: String,
      trim: true
    }],
    salaryRange: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      },
      currency: {
        type: String,
        default: 'USD'
      }
    },
    interestedTags: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },
  savedJobs: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    savedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: 500,
      default: ''
    }
  }],
  appliedJobs: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'viewed', 'interview', 'offer', 'rejected', 'withdrawn'],
      default: 'applied'
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: ''
    }
  }],
  notifications: {
    emailAlerts: {
      type: Boolean,
      default: true
    },
    jobMatches: {
      type: Boolean,
      default: true
    },
    applicationUpdates: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: false
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'student', 'premium', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing'],
      default: 'active'
    },
    subscriptionId: {
      type: String,
      default: null
    },
    customerId: {
      type: String,
      default: null
    },
    validUntil: {
      type: Date,
      default: null
    },
    startDate: {
      type: Date,
      default: null
    },
    canceledAt: {
      type: Date,
      default: null
    },
    features: [{
      type: String
    }]
  },
  activityLog: [{
    action: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  isAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  adminRole: {
    type: String,
    enum: ['super-admin', 'admin', 'moderator', null],
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.firebaseUid;
      return ret;
    }
  }
});

userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ 'profile.title': 'text', 'profile.bio': 'text', 'skills.name': 'text' });
userSchema.index({ 'preferences.interestedTags': 1 });
userSchema.index({ lastLoginAt: -1 });

userSchema.pre('save', function(next) {
  if (this.isModified('preferences.interestedTags')) {
    this.preferences.interestedTags = this.preferences.interestedTags.map(tag => tag.toLowerCase().trim());
  }
  
  if (this.isModified('skills')) {
    this.skills = this.skills.map(skill => ({
      ...skill,
      name: skill.name.trim()
    }));
  }
  
  next();
});

userSchema.methods.addSavedJob = function(jobId, notes = '') {
  const existingSave = this.savedJobs.find(save => save.jobId.toString() === jobId.toString());
  
  if (!existingSave) {
    this.savedJobs.push({
      jobId,
      notes,
      savedAt: new Date()
    });
  }
  
  return this.save();
};

userSchema.methods.removeSavedJob = function(jobId) {
  this.savedJobs = this.savedJobs.filter(save => save.jobId.toString() !== jobId.toString());
  return this.save();
};

userSchema.methods.addAppliedJob = function(jobId, status = 'applied', notes = '') {
  const existingApplication = this.appliedJobs.find(app => app.jobId.toString() === jobId.toString());
  
  if (existingApplication) {
    existingApplication.status = status;
    existingApplication.notes = notes;
    existingApplication.appliedAt = new Date();
  } else {
    this.appliedJobs.push({
      jobId,
      status,
      notes,
      appliedAt: new Date()
    });
  }
  
  return this.save();
};

userSchema.methods.logActivity = function(action, details = {}) {
  this.activityLog.push({
    action,
    details,
    timestamp: new Date()
  });
  
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  return this.save();
};

userSchema.statics.findByFirebaseUid = function(firebaseUid) {
  return this.findOne({ firebaseUid, isActive: true });
};

userSchema.statics.createFromFirebase = function(firebaseUser) {
  return this.create({
    firebaseUid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email,
    picture: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    lastLoginAt: new Date()
  });
};

module.exports = mongoose.model('User', userSchema);