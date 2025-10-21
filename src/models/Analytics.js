/**
 * Analytics Model
 *
 * Tracks user interactions, events, and chatbot performance metrics
 * for analytics and insights.
 */

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },

  eventType: {
    type: String,
    required: true,
    enum: [
      'chatbot_intent',
      'chatbot_message',
      'page_view',
      'feature_usage',
      'resume_upload',
      'resume_analysis',
      'job_search',
      'mock_interview',
      'roadmap_created',
      'roadmap_progress',
      'mentor_message',
      'profile_update',
      'login',
      'logout',
      'error'
    ],
    index: true
  },

  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // For chatbot-specific analytics
  intent: {
    type: String,
    sparse: true,
    index: true
  },

  confidence: {
    type: Number,
    min: 0,
    max: 1
  },

  source: {
    type: String,
    enum: ['dialogflow-cx', 'vertex-ai', 'gemini', 'frontend', 'backend', 'webhook'],
    default: 'backend'
  },

  // Session information
  sessionId: {
    type: String,
    sparse: true
  },

  // Device and browser info
  userAgent: {
    type: String
  },

  ipAddress: {
    type: String
  },

  // Response time in milliseconds
  responseTime: {
    type: Number
  },

  // Error tracking
  isError: {
    type: Boolean,
    default: false
  },

  errorMessage: {
    type: String
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
analyticsSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ intent: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });

// Static method to get chatbot intent statistics
analyticsSchema.statics.getChatbotIntentStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        eventType: 'chatbot_intent',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$eventData.intent',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$eventData.confidence' },
        users: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        intent: '$_id',
        count: 1,
        avgConfidence: 1,
        uniqueUsers: { $size: '$users' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get user activity timeline
analyticsSchema.statics.getUserActivityTimeline = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('eventType eventData timestamp source')
    .lean();
};

// Static method to get event counts by type
analyticsSchema.statics.getEventCountsByType = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        eventType: '$_id',
        count: 1
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get average response time
analyticsSchema.statics.getAverageResponseTime = async function(source, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        source,
        responseTime: { $exists: true },
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' }
      }
    }
  ]);

  return result[0] || { avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0 };
};

// Static method to track error rate
analyticsSchema.statics.getErrorRate = async function(startDate, endDate) {
  const totalEvents = await this.countDocuments({
    timestamp: { $gte: startDate, $lte: endDate }
  });

  const errorEvents = await this.countDocuments({
    isError: true,
    timestamp: { $gte: startDate, $lte: endDate }
  });

  const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

  return {
    totalEvents,
    errorEvents,
    errorRate: errorRate.toFixed(2)
  };
};

// Static method to get most active users
analyticsSchema.statics.getMostActiveUsers = async function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        userId: { $ne: 'anonymous' }
      }
    },
    {
      $group: {
        _id: '$userId',
        eventCount: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $sort: { eventCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        userId: '$_id',
        eventCount: 1,
        lastActivity: 1
      }
    }
  ]);
};

// Static method to get daily event counts
analyticsSchema.statics.getDailyEventCounts = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        count: 1
      }
    }
  ]);
};

// Instance method to mark as error
analyticsSchema.methods.markAsError = function(errorMessage) {
  this.isError = true;
  this.errorMessage = errorMessage;
  return this.save();
};

// Pre-save middleware to extract intent from eventData
analyticsSchema.pre('save', function(next) {
  if (this.eventType === 'chatbot_intent' && this.eventData && this.eventData.intent) {
    this.intent = this.eventData.intent;
    this.confidence = this.eventData.confidence;
  }
  next();
});

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
