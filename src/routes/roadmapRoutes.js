const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmapController');
const roadmapRecommender = require('../services/roadmapRecommender');
const { authenticateUser } = require('../middleware/authMiddleware');
const { checkUsageLimit, incrementUsage } = require('../middleware/usageLimits');

router.post('/generate',
  authenticateUser,
  checkUsageLimit('roadmapGeneration'),
  roadmapController.generateRoadmap,
  incrementUsage
);

// Get personalized roadmap recommendations based on user's resume
router.get('/personalized',
  authenticateUser,
  checkUsageLimit('roadmapGeneration'),
  async (req, res, next) => {
    try {
      const userId = req.user.uid; // From auth middleware

      console.log('🎯 Fetching personalized roadmap for user:', userId);

      const recommendations = await roadmapRecommender.getPersonalizedRoadmap(userId);

      if (!recommendations) {
        console.log('ℹ️ No resume found, sending hasResume=false response');
        return res.status(200).json({
          success: true,
          hasResume: false,
          message: 'Upload a resume to get personalized roadmap recommendations',
          data: null
        });
      }

      console.log('✅ Personalized recommendations generated:', recommendations.recommendedDomain);
      console.log('📤 Sending response to client...');

      // Increment usage after successful generation
      await incrementUsage(req, res, () => {});

      return res.status(200).json({
        success: true,
        hasResume: true,
        message: 'Personalized roadmap recommendations generated',
        data: recommendations
      });

    } catch (error) {
      console.error('❌ Personalized roadmap error:', error);
      console.error('Stack:', error.stack);

      return res.status(500).json({
        success: false,
        message: 'Failed to generate personalized recommendations',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;