const express = require('express');
const jobController = require('../controllers/jobController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { checkUsageLimit, incrementUsage } = require('../middleware/usageLimits');

const router = express.Router();

// Public routes
router.get('/', jobController.getAllJobs);

router.get('/featured', jobController.getFeaturedJobs);

router.get('/stats', jobController.getJobStats);

router.get('/search', jobController.searchJobs);

// Protected routes (require authentication)
router.get('/recommendations',
  authenticateUser,
  checkUsageLimit('jobRecommendations'),
  jobController.getRecommendations,
  incrementUsage
);

router.get('/:id', jobController.getJobById);

module.exports = router;