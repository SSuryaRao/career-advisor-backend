const express = require('express');
const router = express.Router();
const roadmapProgressController = require('../controllers/roadmapProgressController2');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Save or update roadmap progress
router.post('/save', roadmapProgressController.saveRoadmapProgress);

// Get roadmap progress (with query parameters)
router.get('/get', roadmapProgressController.getRoadmapProgress);

// Get user's active roadmaps
router.get('/user', roadmapProgressController.getUserRoadmaps);

// Toggle milestone completion status
router.post('/milestone/toggle', roadmapProgressController.toggleMilestone);

// Get roadmap statistics
router.get('/stats', roadmapProgressController.getRoadmapStats);

// Deactivate roadmap
router.delete('/:roadmapId', roadmapProgressController.deactivateRoadmap);

module.exports = router;