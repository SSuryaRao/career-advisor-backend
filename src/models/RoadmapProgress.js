const mongoose = require('mongoose');

const roadmapProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  careerDomain: {
    type: String,
    required: true
  },
  skillLevel: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  completedMilestones: [{
    milestoneId: String,
    completedAt: {
      type: Date,
      default: Date.now
    },
    completedSubtasks: [{
      type: String
    }]
  }],
  roadmapData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
roadmapProgressSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound index for efficient queries
roadmapProgressSchema.index({ userId: 1, careerDomain: 1, skillLevel: 1 }, { unique: true });
// Additional index for date-range queries
roadmapProgressSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('RoadmapProgress', roadmapProgressSchema);