const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateUser } = require('../middleware/authMiddleware');
const { checkUsageLimit, incrementUsage } = require('../middleware/usageLimits');
const {
  getDomains,
  getDomainDetails,
  generateQuestions,
  analyzeResponseStandard,
  analyzeResponseAdvanced,
  startSession,
  saveSession,
  getSessionHistory,
  getSessionDetails
} = require('../controllers/intelligentInterviewController');

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit (increased from 50MB to support longer recordings)
  }
});

// Public routes (no auth needed)
router.get('/domains', getDomains);
router.get('/domains/:domainId', getDomainDetails);

// Apply authentication to all routes below
router.use(authenticateUser);

// Generate interview questions (no limit - just generates questions)
router.post('/generate-questions', generateQuestions);

// Analyze response - Standard mode (text + audio)
router.post('/analyze/standard',
  checkUsageLimit('intelligentInterviewStandard'),
  analyzeResponseStandard,
  incrementUsage
);

// Analyze response - Advanced mode (VIDEO analysis)
// NOTE: We check the limit at session START, not per question
// We increment usage when the FIRST question in a session is analyzed
router.post(
  '/analyze/advanced',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  analyzeResponseAdvanced
);

// Start a new interview session
// We check the limit HERE when starting advanced mode sessions
router.post('/session/start', startSession);

// Save completed session (no limit)
router.post('/session/save', saveSession);

// Get user's session history
router.get('/session/history/:userId', getSessionHistory);

// Get session details
router.get('/session/:userId/:sessionId', getSessionDetails);

module.exports = router;
