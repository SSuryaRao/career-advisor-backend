const express = require('express');
const router = express.Router();
const multer = require('multer');
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
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Get all available interview domains
router.get('/domains', getDomains);

// Get domain details by ID
router.get('/domains/:domainId', getDomainDetails);

// Generate interview questions
router.post('/generate-questions', generateQuestions);

// Analyze response - Standard mode (text only)
router.post('/analyze/standard', analyzeResponseStandard);

// Analyze response - Advanced mode (with audio/video)
router.post(
  '/analyze/advanced',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  analyzeResponseAdvanced
);

// Start a new interview session
router.post('/session/start', startSession);

// Save completed session
router.post('/session/save', saveSession);

// Get user's session history
router.get('/session/history/:userId', getSessionHistory);

// Get session details
router.get('/session/:userId/:sessionId', getSessionDetails);

module.exports = router;
