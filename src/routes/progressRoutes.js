const express = require('express');
const router = express.Router();
const {
  getUserProgress,
  completeResource,
  uncompleteResource,
  getCompletedResources,
  getUserAchievements,
  updatePreferences,
  updateWeeklyGoal,
  getProgressStats,
  getLeaderboard,
  getDashboardSummary
} = require('../controllers/progressController');

// Get user progress
router.get('/user/:userId', getUserProgress);

// Get user progress statistics
router.get('/user/:userId/stats', getProgressStats);

// Get user's completed resources
router.get('/user/:userId/completed', getCompletedResources);

// Get user achievements
router.get('/user/:userId/achievements', getUserAchievements);

// Mark resource as completed
router.post('/user/:userId/complete', completeResource);

// Mark resource as uncompleted
router.post('/user/:userId/uncomplete', uncompleteResource);

// Update user preferences
router.put('/user/:userId/preferences', updatePreferences);

// Update weekly goal
router.put('/user/:userId/weekly-goal', updateWeeklyGoal);

// Get leaderboard
router.get('/leaderboard', getLeaderboard);

// Get unified dashboard summary
router.get('/dashboard/:userId', getDashboardSummary);

module.exports = router;