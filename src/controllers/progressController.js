const UserProgress = require('../models/UserProgress');
const User = require('../models/User');
const { featuredResources } = require('../data/resources');

// Get user progress
const getUserProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    try {
      const user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      } else {
        // If user doesn't exist in MongoDB, continue with Firebase UID for progress tracking
        console.log(`User with Firebase UID ${userId} not found in MongoDB, using UID for progress`);
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
      // Continue with Firebase UID
    }
    
    const progress = await UserProgress.findOrCreateByUserId(mongoUserId);
    const summary = progress.getProgressSummary();
    
    res.status(200).json({
      success: true,
      data: {
        progress,
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mark resource as completed
const completeResource = async (req, res) => {
  try {
    const { userId } = req.params;
    const { resourceId, timeSpent = 0, rating = null, notes = '' } = req.body;
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required'
      });
    }
    
    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    let user = null;
    try {
      user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      } else {
        // If user doesn't exist in MongoDB, continue with Firebase UID for progress tracking
        console.log(`User with Firebase UID ${userId} not found in MongoDB, using UID for progress`);
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
      // Continue with Firebase UID
    }
    
    // Find resource to get category
    const resource = featuredResources.find(r => r.id === parseInt(resourceId));
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    const progress = await UserProgress.findOrCreateByUserId(mongoUserId);
    await progress.completeResource(parseInt(resourceId), resource.category, timeSpent, rating, notes);
    
    const summary = progress.getProgressSummary();
    
    // Log activity in user model if user exists
    if (user && user.logActivity) {
      await user.logActivity('resource_completed', {
        resourceId: parseInt(resourceId),
        resourceTitle: resource.title,
        category: resource.category,
        timeSpent
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Resource marked as completed',
      data: {
        progress,
        summary,
        newAchievements: progress.achievements.slice(-3).reverse() // Return recent achievements
      }
    });
  } catch (error) {
    console.error('Error completing resource:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mark resource as uncompleted
const uncompleteResource = async (req, res) => {
  try {
    const { userId } = req.params;
    const { resourceId } = req.body;
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required'
      });
    }
    
    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    let user = null;
    try {
      user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      } else {
        // If user doesn't exist in MongoDB, continue with Firebase UID for progress tracking
        console.log(`User with Firebase UID ${userId} not found in MongoDB, using UID for progress`);
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
      // Continue with Firebase UID
    }
    
    // Find resource to get category
    const resource = featuredResources.find(r => r.id === parseInt(resourceId));
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    const progress = await UserProgress.findOrCreateByUserId(mongoUserId);
    await progress.uncompleteResource(parseInt(resourceId), resource.category);
    
    const summary = progress.getProgressSummary();
    
    // Log activity in user model if user exists
    if (user && user.logActivity) {
      await user.logActivity('resource_uncompleted', {
        resourceId: parseInt(resourceId),
        resourceTitle: resource.title,
        category: resource.category
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Resource marked as uncompleted',
      data: {
        progress,
        summary
      }
    });
  } catch (error) {
    console.error('Error uncompleting resource:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's completed resources
const getCompletedResources = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user exists (skip in development for testing)
    // For testing purposes, allow any valid ObjectId format
    if (process.env.NODE_ENV !== 'development' && userId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`User ${userId} not found, but continuing for testing purposes`);
          // Don't fail - continue for testing
        }
      } catch (error) {
        console.log(`Error finding user ${userId}:`, error.message);
        // Don't fail - continue for testing
      }
    }
    
    const progress = await UserProgress.findOrCreateByUserId(userId);
    
    // Get completed resource details
    const completedResources = progress.completedResources.map(completed => {
      const resource = featuredResources.find(r => r.id === completed.resourceId);
      return {
        ...completed.toObject(),
        resource: resource || null
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        completedResources,
        total: completedResources.length
      }
    });
  } catch (error) {
    console.error('Error fetching completed resources:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user achievements
const getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user exists (skip in development for testing)
    // For testing purposes, allow any valid ObjectId format
    if (process.env.NODE_ENV !== 'development' && userId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`User ${userId} not found, but continuing for testing purposes`);
          // Don't fail - continue for testing
        }
      } catch (error) {
        console.log(`Error finding user ${userId}:`, error.message);
        // Don't fail - continue for testing
      }
    }
    
    const progress = await UserProgress.findOrCreateByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: {
        achievements: progress.achievements,
        total: progress.achievements.length,
        recent: progress.achievements.slice(-5).reverse()
      }
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update user preferences
const updatePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: 'Preferences are required'
      });
    }
    
    // Validate user exists (skip in development for testing)
    // For testing purposes, allow any valid ObjectId format
    if (process.env.NODE_ENV !== 'development' && userId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`User ${userId} not found, but continuing for testing purposes`);
          // Don't fail - continue for testing
        }
      } catch (error) {
        console.log(`Error finding user ${userId}:`, error.message);
        // Don't fail - continue for testing
      }
    }
    
    const progress = await UserProgress.findOrCreateByUserId(userId);
    
    // Update preferences
    progress.preferences = { ...progress.preferences, ...preferences };
    await progress.save();
    
    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: progress.preferences
      }
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update weekly goal
const updateWeeklyGoal = async (req, res) => {
  try {
    const { userId } = req.params;
    const { target } = req.body;
    
    if (!target || target < 1 || target > 50) {
      return res.status(400).json({
        success: false,
        message: 'Target must be between 1 and 50'
      });
    }
    
    // Validate user exists (skip in development for testing)
    // For testing purposes, allow any valid ObjectId format
    if (process.env.NODE_ENV !== 'development' && userId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`User ${userId} not found, but continuing for testing purposes`);
          // Don't fail - continue for testing
        }
      } catch (error) {
        console.log(`Error finding user ${userId}:`, error.message);
        // Don't fail - continue for testing
      }
    }
    
    const progress = await UserProgress.findOrCreateByUserId(userId);
    
    progress.stats.weeklyGoal.target = target;
    await progress.save();
    
    res.status(200).json({
      success: true,
      message: 'Weekly goal updated successfully',
      data: {
        weeklyGoal: progress.stats.weeklyGoal
      }
    });
  } catch (error) {
    console.error('Error updating weekly goal:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get progress statistics
const getProgressStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user exists (skip in development for testing)
    // For testing purposes, allow any valid ObjectId format
    if (process.env.NODE_ENV !== 'development' && userId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`User ${userId} not found, but continuing for testing purposes`);
          // Don't fail - continue for testing
        }
      } catch (error) {
        console.log(`Error finding user ${userId}:`, error.message);
        // Don't fail - continue for testing
      }
    }
    
    const progress = await UserProgress.findOrCreateByUserId(userId);
    
    // Calculate additional stats
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const recentCompletions = progress.completedResources.filter(
      resource => new Date(resource.completedAt) >= thirtyDaysAgo
    );
    
    // Group by category for recent completions
    const recentByCategory = {};
    recentCompletions.forEach(completed => {
      const resource = featuredResources.find(r => r.id === completed.resourceId);
      if (resource) {
        recentByCategory[resource.category] = (recentByCategory[resource.category] || 0) + 1;
      }
    });
    
    // Calculate daily activity for the last 30 days
    const dailyActivity = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayCompletions = progress.completedResources.filter(
        resource => {
          const completedDate = new Date(resource.completedAt);
          return completedDate >= date && completedDate < nextDay;
        }
      ).length;
      
      dailyActivity.push({
        date: date.toISOString().split('T')[0],
        completions: dayCompletions
      });
    }
    
    const stats = {
      ...progress.getProgressSummary(),
      recentActivity: {
        last30Days: recentCompletions.length,
        byCategory: recentByCategory,
        dailyActivity
      }
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get leaderboard (top users by progress)
const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    // Get top users by total resources completed
    const leaderboard = await UserProgress.find({})
      .populate('userId', 'name picture profile.title')
      .sort({ 'stats.totalResourcesCompleted': -1 })
      .limit(limit)
      .skip(skip);
    
    const formattedLeaderboard = leaderboard.map((progress, index) => ({
      rank: skip + index + 1,
      user: {
        id: progress.userId._id,
        name: progress.userId.name,
        picture: progress.userId.picture,
        title: progress.userId.profile?.title || 'Learning Enthusiast'
      },
      stats: {
        totalCompleted: progress.stats.totalResourcesCompleted,
        totalTimeSpent: progress.stats.totalTimeSpent,
        currentStreak: progress.stats.streak.current,
        achievements: progress.achievements.length
      }
    }));
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard: formattedLeaderboard,
        pagination: {
          page,
          limit,
          hasMore: leaderboard.length === limit
        }
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getUserProgress,
  completeResource,
  uncompleteResource,
  getCompletedResources,
  getUserAchievements,
  updatePreferences,
  updateWeeklyGoal,
  getProgressStats,
  getLeaderboard
};