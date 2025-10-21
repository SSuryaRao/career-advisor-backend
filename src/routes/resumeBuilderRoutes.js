const express = require('express');
const {
  createResumeFromProfile,
  generateProfessionalSummary
} = require('../controllers/resumeBuilderController');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Routes
router.post('/generate-summary', generateProfessionalSummary);
router.post('/create', createResumeFromProfile);

module.exports = router;
