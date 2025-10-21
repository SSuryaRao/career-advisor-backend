const express = require('express');
const router = express.Router();
const {
  saveInterviewSession,
  saveAptitudeTestResult,
  getUserStats,
  getInterviewHistory,
  getAptitudeTestHistory
} = require('../controllers/mockInterviewController');

// Save mock interview session
router.post('/interview-session', saveInterviewSession);

// Save aptitude test result
router.post('/aptitude-result', saveAptitudeTestResult);

// Get user statistics
router.get('/stats/:userId', getUserStats);

// Get interview history
router.get('/interview-history/:userId', getInterviewHistory);

// Get aptitude test history
router.get('/aptitude-history/:userId', getAptitudeTestHistory);

module.exports = router;
