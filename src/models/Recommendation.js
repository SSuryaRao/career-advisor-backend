const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  recommendations: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    matchedSkills: [{
      type: String,
      trim: true
    }],
    matchedInterests: [{
      type: String,
      trim: true
    }],
    roi: {
      time: String,
      cost: Number,
      salary: String,
      roiFactor: String
    },
    trends: {
      type: String,
      trim: true
    },
    previewTopics: [{
      type: String,
      trim: true
    }],
    domain: {
      type: String,
      required: true,
      trim: true
    },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  }],
  generatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create compound index for efficient queries
recommendationSchema.index({ userId: 1, generatedAt: -1 });

// Update lastUpdated on save
recommendationSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Recommendation', recommendationSchema);