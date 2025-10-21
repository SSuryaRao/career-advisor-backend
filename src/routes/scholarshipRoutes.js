const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');
const { authenticateUser } = require('../middleware/authMiddleware');

// GET /api/scholarships/trending - Get trending scholarships (must be before /:id)
router.get('/trending', scholarshipController.getTrendingScholarships);

// POST /api/scholarships/personalized - Get personalized AI recommendations (requires auth)
router.post('/personalized', authenticateUser, scholarshipController.getPersonalizedRecommendations);

// GET /api/scholarships/:id - Get single scholarship
router.get('/:id', scholarshipController.getScholarshipById);

// GET /api/scholarships - Get all scholarships with filters
router.get('/', scholarshipController.getAllScholarships);

module.exports = router;