const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { checkUsageLimit, incrementUsage } = require('../middleware/usageLimits');

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  console.log('🎯 Recommendation route hit:', req.method, req.path);
  next();
});
router.use(authenticateUser);

// Generate new recommendations based on user profile
router.post('/generate',
  checkUsageLimit('careerRecommendations'),
  (req, res) => recommendationController.generateRecommendations(req, res),
  incrementUsage
);

// Get user's saved recommendations
router.get('/get', (req, res) => recommendationController.getRecommendations(req, res));

module.exports = router;