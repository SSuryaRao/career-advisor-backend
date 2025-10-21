const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: String, // Firebase UID
    required: true,
    index: true
  },
  completedResources: [{
    resourceId: {
      type: Number,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: {
      type: Number, // in minutes
      default: 0
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    notes: {
      type: String,
      maxlength: 500,
      default: ''
    }
  }],
  stats: {
    totalResourcesCompleted: {
      type: Number,
      default: 0
    },
    totalTimeSpent: {
      type: Number, // in minutes
      default: 0
    },
    categoriesCompleted: {
      'Programming': { type: Number, default: 0 },
      'Data Science': { type: Number, default: 0 },
      'Interview Prep': { type: Number, default: 0 },
      'Career Development': { type: Number, default: 0 },
      'Resume Building': { type: Number, default: 0 }
    },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastCompletionDate: { type: Date, default: null }
    },
    weeklyGoal: {
      target: { type: Number, default: 5 }, // resources per week
      current: { type: Number, default: 0 },
      weekStart: { type: Date, default: Date.now }
    }
  },
  achievements: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    icon: {
      type: String,
      default: 'trophy'
    }
  }],
  preferences: {
    dailyReminder: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: true
    },
    achievementNotifications: {
      type: Boolean,
      default: true
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

// Indexes for better query performance
userProgressSchema.index({ userId: 1 });
userProgressSchema.index({ 'completedResources.resourceId': 1 });
userProgressSchema.index({ 'stats.totalResourcesCompleted': -1 });
userProgressSchema.index({ updatedAt: -1 });

// Method to mark a resource as completed
userProgressSchema.methods.completeResource = function(resourceId, resourceCategory = 'Programming', timeSpent = 0, rating = null, notes = '') {
  // Check if resource is already completed
  const existingResource = this.completedResources.find(r => r.resourceId === resourceId);
  
  if (existingResource) {
    // Update existing completion
    existingResource.completedAt = new Date();
    existingResource.timeSpent = timeSpent;
    existingResource.rating = rating;
    existingResource.notes = notes;
  } else {
    // Add new completion
    this.completedResources.push({
      resourceId,
      completedAt: new Date(),
      timeSpent,
      rating,
      notes
    });
    
    // Update stats
    this.stats.totalResourcesCompleted += 1;
    if (this.stats.categoriesCompleted[resourceCategory] !== undefined) {
      this.stats.categoriesCompleted[resourceCategory] += 1;
    }
  }
  
  // Update total time spent
  this.stats.totalTimeSpent += timeSpent;
  
  // Update streak
  this.updateStreak();
  
  // Update weekly goal progress
  this.updateWeeklyGoal();
  
  // Check for achievements
  this.checkAchievements();
  
  return this.save();
};

// Method to uncomplete a resource
userProgressSchema.methods.uncompleteResource = function(resourceId, resourceCategory = 'Programming') {
  const resourceIndex = this.completedResources.findIndex(r => r.resourceId === resourceId);
  
  if (resourceIndex !== -1) {
    const resource = this.completedResources[resourceIndex];
    
    // Remove from completed resources
    this.completedResources.splice(resourceIndex, 1);
    
    // Update stats
    this.stats.totalResourcesCompleted = Math.max(0, this.stats.totalResourcesCompleted - 1);
    this.stats.totalTimeSpent = Math.max(0, this.stats.totalTimeSpent - resource.timeSpent);
    
    if (this.stats.categoriesCompleted[resourceCategory] !== undefined) {
      this.stats.categoriesCompleted[resourceCategory] = Math.max(0, this.stats.categoriesCompleted[resourceCategory] - 1);
    }
    
    // Update weekly goal (decrease current count if within same week)
    const weekStart = new Date(this.stats.weeklyGoal.weekStart);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    if (resource.completedAt >= weekStart && weekStart >= oneWeekAgo) {
      this.stats.weeklyGoal.current = Math.max(0, this.stats.weeklyGoal.current - 1);
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to update streak
userProgressSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastCompletion = this.stats.streak.lastCompletionDate;
  
  if (!lastCompletion) {
    // First completion
    this.stats.streak.current = 1;
    this.stats.streak.longest = 1;
    this.stats.streak.lastCompletionDate = today;
  } else {
    const lastCompletionDate = new Date(lastCompletion);
    lastCompletionDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - lastCompletionDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    
    if (diffDays === 0) {
      // Same day, don't change streak
      return;
    } else if (diffDays === 1) {
      // Consecutive day
      this.stats.streak.current += 1;
      this.stats.streak.longest = Math.max(this.stats.streak.longest, this.stats.streak.current);
      this.stats.streak.lastCompletionDate = today;
    } else {
      // Streak broken
      this.stats.streak.current = 1;
      this.stats.streak.lastCompletionDate = today;
    }
  }
};

// Method to update weekly goal progress
userProgressSchema.methods.updateWeeklyGoal = function() {
  const now = new Date();
  const weekStart = new Date(this.stats.weeklyGoal.weekStart);
  
  // Check if we need to reset weekly goal (if it's a new week)
  const diffTime = now.getTime() - weekStart.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);
  
  if (diffDays >= 7) {
    // Reset weekly goal
    this.stats.weeklyGoal.current = 1;
    this.stats.weeklyGoal.weekStart = now;
  } else {
    // Increment current week's progress
    this.stats.weeklyGoal.current += 1;
  }
};

// Method to check and unlock achievements
userProgressSchema.methods.checkAchievements = function() {
  const achievements = [];
  
  // First Resource Achievement
  if (this.stats.totalResourcesCompleted === 1 && !this.hasAchievement('first-resource')) {
    achievements.push({
      id: 'first-resource',
      name: 'Getting Started',
      description: 'Completed your first resource!',
      icon: 'play-circle'
    });
  }
  
  // Milestone Achievements
  const milestones = [5, 10, 25, 50, 100];
  milestones.forEach(milestone => {
    const achievementId = `milestone-${milestone}`;
    if (this.stats.totalResourcesCompleted >= milestone && !this.hasAchievement(achievementId)) {
      achievements.push({
        id: achievementId,
        name: `${milestone} Resources`,
        description: `Completed ${milestone} learning resources!`,
        icon: 'target'
      });
    }
  });
  
  // Streak Achievements
  if (this.stats.streak.current >= 7 && !this.hasAchievement('week-streak')) {
    achievements.push({
      id: 'week-streak',
      name: 'Week Warrior',
      description: 'Maintained a 7-day learning streak!',
      icon: 'fire'
    });
  }
  
  if (this.stats.streak.current >= 30 && !this.hasAchievement('month-streak')) {
    achievements.push({
      id: 'month-streak',
      name: 'Monthly Master',
      description: 'Maintained a 30-day learning streak!',
      icon: 'flame'
    });
  }
  
  // Category Expert Achievements
  Object.keys(this.stats.categoriesCompleted).forEach(category => {
    const count = this.stats.categoriesCompleted[category];
    if (count >= 10) {
      const achievementId = `expert-${category.toLowerCase().replace(' ', '-')}`;
      if (!this.hasAchievement(achievementId)) {
        achievements.push({
          id: achievementId,
          name: `${category} Expert`,
          description: `Completed 10+ resources in ${category}!`,
          icon: 'graduation-cap'
        });
      }
    }
  });
  
  // Time-based Achievements
  if (this.stats.totalTimeSpent >= 600 && !this.hasAchievement('time-10h')) { // 10 hours
    achievements.push({
      id: 'time-10h',
      name: 'Dedicated Learner',
      description: 'Spent 10+ hours learning!',
      icon: 'clock'
    });
  }
  
  // Add new achievements
  achievements.forEach(achievement => {
    this.achievements.push(achievement);
  });
};

// Helper method to check if user has an achievement
userProgressSchema.methods.hasAchievement = function(achievementId) {
  return this.achievements.some(achievement => achievement.id === achievementId);
};

// Method to get progress summary
userProgressSchema.methods.getProgressSummary = function() {
  const totalResources = 40; // Total available resources
  const completionPercentage = Math.round((this.stats.totalResourcesCompleted / totalResources) * 100);
  
  return {
    totalCompleted: this.stats.totalResourcesCompleted,
    totalAvailable: totalResources,
    completionPercentage,
    totalTimeSpent: this.stats.totalTimeSpent,
    currentStreak: this.stats.streak.current,
    longestStreak: this.stats.streak.longest,
    weeklyProgress: {
      current: this.stats.weeklyGoal.current,
      target: this.stats.weeklyGoal.target,
      percentage: Math.round((this.stats.weeklyGoal.current / this.stats.weeklyGoal.target) * 100)
    },
    categoryBreakdown: this.stats.categoriesCompleted,
    recentAchievements: this.achievements.slice(-3).reverse(),
    totalAchievements: this.achievements.length
  };
};

// Static method to find or create user progress
userProgressSchema.statics.findOrCreateByUserId = function(userId) {
  return this.findOne({ userId }).then(progress => {
    if (progress) {
      return progress;
    }
    
    // For testing purposes, handle cases where userId might be a string
    // Convert string userId to ObjectId if needed, or use the string directly
    let userIdToUse = userId;
    try {
      if (typeof userId === 'string' && userId.match(/^[0-9a-fA-F]{24}$/)) {
        userIdToUse = require('mongoose').Types.ObjectId(userId);
      }
    } catch (error) {
      console.log('Using userId as string for testing:', userId);
    }
    
    // Create new progress document
    return this.create({
      userId: userIdToUse,
      completedResources: [],
      stats: {
        totalResourcesCompleted: 0,
        totalTimeSpent: 0,
        categoriesCompleted: {
          'Programming': 0,
          'Data Science': 0,
          'Interview Prep': 0,
          'Career Development': 0,
          'Resume Building': 0
        },
        streak: {
          current: 0,
          longest: 0,
          lastCompletionDate: null
        },
        weeklyGoal: {
          target: 5,
          current: 0,
          weekStart: new Date()
        }
      },
      achievements: [],
      preferences: {
        dailyReminder: true,
        weeklyDigest: true,
        achievementNotifications: true
      }
    });
  });
};

module.exports = mongoose.model('UserProgress', userProgressSchema);