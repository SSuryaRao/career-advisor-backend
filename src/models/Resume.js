const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: String, // Firebase UID
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  firebaseUrl: {
    type: String,
    required: true // Firebase Storage download URL
  },
  firebaseStoragePath: {
    type: String,
    required: true // Firebase Storage path for deletion
  },
  extractedText: {
    type: String,
    required: true // Extracted text content from PDF
  },
  textLength: {
    type: Number,
    required: true
  },
  atsAnalysis: {
    overallScore: {
      type: Number,
      required: false, // Not required initially, set after analysis
      min: 0,
      max: 100
    },
    scores: {
      keywords: {
        type: Number,
        required: false, // Not required initially
        min: 0,
        max: 100
      },
      formatting: {
        type: Number,
        required: false, // Not required initially
        min: 0,
        max: 100
      },
      experience: {
        type: Number,
        required: false, // Not required initially
        min: 0,
        max: 100
      },
      skills: {
        type: Number,
        required: false, // Not required initially
        min: 0,
        max: 100
      }
    },
    suggestions: [{
      section: {
        type: String,
        required: true
      },
      issue: {
        type: String,
        required: true
      },
      improvement: {
        type: String,
        required: true
      },
      beforeAfter: {
        before: String,
        after: String
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      }
    }],
    keywordAnalysis: {
      found: [{
        type: String,
        trim: true
      }],
      missing: [{
        type: String,
        trim: true
      }],
      suggested: [{
        type: String,
        trim: true
      }],
      density: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },
    strengths: [{
      type: String,
      trim: true
    }],
    weaknesses: [{
      type: String,
      trim: true
    }],
    industryMatch: {
      detectedIndustry: String,
      matchScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      recommendations: [{
        industry: String,
        score: Number,
        reason: String
      }]
    }
  },
  metadata: {
    uploadMethod: {
      type: String,
      enum: ['drag-drop', 'file-picker'],
      default: 'file-picker'
    },
    analysisModel: {
      type: String,
      default: 'gemini-1.5-flash'
    },
    analysisVersion: {
      type: String,
      default: '1.0'
    },
    processingTime: {
      type: Number, // milliseconds
      default: 0
    },
    ipAddress: String,
    userAgent: String
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'uploading'
  },
  errorLog: [{
    stage: {
      type: String,
      enum: ['upload', 'text-extraction', 'ai-analysis', 'storage']
    },
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    shareId: {
      type: String,
      unique: true,
      sparse: true
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    viewCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  roadmapRecommendations: {
    careerDomain: String,
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    reasons: [String],
    skillGaps: [String],
    nextSteps: [String],
    generatedAt: Date,
    lastUpdated: Date
  },
  careerInsights: {
    currentLevel: {
      type: String,
      enum: ['entry', 'intermediate', 'advanced', 'expert']
    },
    yearsOfExperience: Number,
    primaryDomain: String,
    secondaryDomains: [String],
    readinessScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  improvement: {
    originalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    improvedScore: {
      type: Number,
      min: 0,
      max: 100
    },
    scoreIncrease: {
      type: Number
    },
    improvedResumeUrl: String,
    improvedResumePath: String,
    storageType: {
      type: String,
      enum: ['firebase', 'local']
    },
    appliedSuggestions: Number,
    generatedAt: Date,
    processingTime: Number,
    improvedAnalysis: {
      overallScore: Number,
      scores: {
        keywords: Number,
        formatting: Number,
        experience: Number,
        skills: Number
      },
      topStrengths: [String]
    }
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

// Indexes for performance
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ 'atsAnalysis.overallScore': -1 });
resumeSchema.index({ status: 1 });
resumeSchema.index({ 'shares.shareId': 1 }, { sparse: true });

// Virtual for analysis summary
resumeSchema.virtual('analysisSummary').get(function() {
  if (!this.atsAnalysis) return null;
  
  return {
    overallScore: this.atsAnalysis.overallScore,
    grade: this.atsAnalysis.overallScore >= 90 ? 'A' :
           this.atsAnalysis.overallScore >= 80 ? 'B' :
           this.atsAnalysis.overallScore >= 70 ? 'C' :
           this.atsAnalysis.overallScore >= 60 ? 'D' : 'F',
    topSuggestion: this.atsAnalysis.suggestions[0] || null,
    improvementAreas: this.atsAnalysis.suggestions.length
  };
});

// Methods
resumeSchema.methods.updateAnalysis = function(analysisData) {
  this.atsAnalysis = analysisData;
  this.status = 'completed';
  return this.save();
};

resumeSchema.methods.createShareLink = function() {
  const shareId = require('crypto').randomBytes(16).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
  
  this.shares.push({
    shareId,
    expiresAt,
    sharedAt: new Date(),
    viewCount: 0,
    isActive: true
  });
  
  return this.save().then(() => shareId);
};

resumeSchema.methods.logError = function(stage, error) {
  this.errorLog.push({
    stage,
    error: error.message || error.toString(),
    timestamp: new Date()
  });
  
  if (this.errorLog.length > 10) {
    this.errorLog = this.errorLog.slice(-10);
  }
  
  return this.save();
};

// Static methods
resumeSchema.statics.findByUserId = function(userId, limit = 10) {
  return this.find({ userId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

resumeSchema.statics.findByShareId = function(shareId) {
  return this.findOne({
    'shares.shareId': shareId,
    'shares.isActive': true,
    'shares.expiresAt': { $gt: new Date() },
    isActive: true
  });
};

resumeSchema.statics.getAnalyticsData = function(userId) {
  return this.aggregate([
    { $match: { userId, isActive: true, status: 'completed' } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$atsAnalysis.overallScore' },
        maxScore: { $max: '$atsAnalysis.overallScore' },
        minScore: { $min: '$atsAnalysis.overallScore' },
        totalResumes: { $sum: 1 },
        totalSuggestions: { $sum: { $size: '$atsAnalysis.suggestions' } }
      }
    }
  ]);
};

module.exports = mongoose.model('Resume', resumeSchema);