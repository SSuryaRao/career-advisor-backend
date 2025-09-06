const express = require('express');
const router = express.Router();

// Test routes for debugging deployment issues
// These routes bypass authentication and user validation

// Test progress completion without authentication
router.post('/progress/complete', async (req, res) => {
  try {
    const { userId, resourceId, timeSpent = 0, rating = null, notes = '' } = req.body;
    
    if (!userId || !resourceId) {
      return res.status(400).json({
        success: false,
        message: 'userId and resourceId are required'
      });
    }

    const UserProgress = require('../models/UserProgress');
    const { featuredResources } = require('../data/resources');
    
    // Find resource to get category
    const resource = featuredResources.find(r => r.id === parseInt(resourceId));
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    const progress = await UserProgress.findOrCreateByUserId(userId);
    await progress.completeResource(parseInt(resourceId), resource.category, timeSpent, rating, notes);
    
    const summary = progress.getProgressSummary();
    
    res.status(200).json({
      success: true,
      message: 'Resource marked as completed (test mode)',
      data: {
        progress,
        summary,
        newAchievements: progress.achievements.slice(-3).reverse()
      }
    });
  } catch (error) {
    console.error('Error in test complete resource:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test get saved jobs without authentication
router.get('/saved-jobs', async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Test endpoint - no authentication required',
      data: {
        jobs: [
          {
            id: 'test-job-1',
            title: 'Test Software Engineer',
            company: 'Test Company',
            location: 'Remote',
            savedAt: new Date().toISOString(),
            notes: 'Test job for demo purposes'
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalJobs: 1,
          hasNext: false,
          hasPrev: false
        }
      }
    });
  } catch (error) {
    console.error('Error in test saved jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test get progress
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const UserProgress = require('../models/UserProgress');
    const progress = await UserProgress.findOrCreateByUserId(userId);
    const summary = progress.getProgressSummary();
    
    res.status(200).json({
      success: true,
      message: 'Progress retrieved (test mode)',
      data: {
        progress,
        summary
      }
    });
  } catch (error) {
    console.error('Error in test get progress:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;