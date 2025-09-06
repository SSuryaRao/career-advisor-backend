const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  roadmapId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    trim: true
  },
  skillLevel: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  progress: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  completedPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  completedMilestones: [{
    milestoneId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  roadmapData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startedAt: {
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
roadmapSchema.index({ userId: 1, domain: 1, skillLevel: 1 });
roadmapSchema.index({ userId: 1, isActive: 1, startedAt: -1 });

// Update lastUpdated and completedPercentage on save
roadmapSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  
  // Calculate completion percentage
  if (this.roadmapData && this.roadmapData.stages) {
    const totalMilestones = this.roadmapData.stages.reduce((acc, stage) => 
      acc + (stage.milestones ? stage.milestones.length : 0), 0
    );
    
    if (totalMilestones > 0) {
      this.completedPercentage = Math.round((this.completedMilestones.length / totalMilestones) * 100);
    }
  }
  
  next();
});

// Instance method to mark milestone as completed
roadmapSchema.methods.markMilestoneCompleted = function(milestoneId, milestoneTitle) {
  const existing = this.completedMilestones.find(m => m.milestoneId === milestoneId);
  if (!existing) {
    this.completedMilestones.push({
      milestoneId,
      title: milestoneTitle,
      completedAt: new Date()
    });
    
    // Update progress object
    this.progress[milestoneId] = true;
  }
  return this.save();
};

// Instance method to mark milestone as incomplete
roadmapSchema.methods.markMilestoneIncomplete = function(milestoneId) {
  this.completedMilestones = this.completedMilestones.filter(m => m.milestoneId !== milestoneId);
  
  // Update progress object
  if (this.progress[milestoneId]) {
    delete this.progress[milestoneId];
  }
  
  return this.save();
};

// Static method to find by user and roadmap criteria
roadmapSchema.statics.findByUserAndCriteria = function(userId, domain, skillLevel) {
  return this.findOne({ 
    userId, 
    domain, 
    skillLevel, 
    isActive: true 
  }).sort({ startedAt: -1 });
};

module.exports = mongoose.model('Roadmap', roadmapSchema);