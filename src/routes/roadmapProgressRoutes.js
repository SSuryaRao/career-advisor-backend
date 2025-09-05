const express = require('express');
const router = express.Router();
const roadmapProgressController = require('../controllers/roadmapProgressController');

// Save or update roadmap progress
router.post('/save', roadmapProgressController.saveProgress);

// Get roadmap progress
router.get('/get', roadmapProgressController.getProgress);

// Toggle milestone completion
router.post('/toggle-milestone', roadmapProgressController.toggleMilestone);

// Get all roadmaps for a user
router.get('/user/:userId', roadmapProgressController.getUserRoadmaps);

// Delete a specific roadmap
router.delete('/:userId/:careerDomain/:skillLevel', roadmapProgressController.deleteRoadmap);

module.exports = router;