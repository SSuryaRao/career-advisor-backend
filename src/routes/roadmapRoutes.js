const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmapController');

router.post('/generate', roadmapController.generateRoadmap);

module.exports = router;