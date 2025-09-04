const express = require('express');
const jobController = require('../controllers/jobController');

const router = express.Router();

router.get('/', jobController.getAllJobs);

router.get('/featured', jobController.getFeaturedJobs);

router.get('/stats', jobController.getJobStats);

router.get('/search', jobController.searchJobs);

router.get('/:id', jobController.getJobById);

module.exports = router;