const mongoose = require('mongoose');

const usageQuotaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: String, // Format: 'YYYY-MM'
    required: true,
    index: true
  },
  tier: {
    type: String,
    enum: ['free', 'student', 'premium', 'pro'],
    required: true
  },

  // Resume features
  resumeAnalysis: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  resumeImprovement: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  resumeBuilder: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },

  // Interview features
  mockInterview: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  intelligentInterviewStandard: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  intelligentInterviewVideo: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },

  // AI Mentor
  aiMentorMessages: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  learningPaths: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },

  // Career features
  jobRecommendations: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  careerRecommendations: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  roadmapGeneration: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },

  // Other features
  scholarshipPersonalization: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  internshipPersonalization: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },
  chatbotMessages: {
    used: { type: Number, default: 0 },
    limit: { type: Number, required: true }
  },

  // Track video interview sessions to avoid double-counting
  // Each session should only count as 1 usage, not per question
  videoSessionsTracked: {
    type: [String],
    default: []
  },

  resetDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for faster queries
usageQuotaSchema.index({ userId: 1, month: 1 }, { unique: true });

// Method to check if limit exceeded
usageQuotaSchema.methods.hasQuotaRemaining = function(featureName) {
  const feature = this[featureName];
  if (!feature) return false;

  // -1 means unlimited
  if (feature.limit === -1) return true;

  return feature.used < feature.limit;
};

// Method to increment usage
usageQuotaSchema.methods.incrementUsage = function(featureName) {
  const feature = this[featureName];
  if (!feature) throw new Error(`Invalid feature: ${featureName}`);

  // Don't increment if unlimited
  if (feature.limit === -1) return this;

  feature.used += 1;
  return this.save();
};

module.exports = mongoose.model('UsageQuota', usageQuotaSchema);
