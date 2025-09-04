const express = require('express');
const userController = require('../controllers/userController');
const { authenticateUser, requireEmailVerification } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateUser);

router.get('/profile', userController.getProfile);

router.put('/profile', userController.updateProfile);

router.get('/saved-jobs', userController.getSavedJobs);

router.post('/saved-jobs/:jobId', userController.saveJob);

router.delete('/saved-jobs/:jobId', userController.unsaveJob);

router.get('/applied-jobs', userController.getAppliedJobs);

router.post('/applied-jobs/:jobId', userController.markJobAsApplied);

router.get('/activity', userController.getActivityLog);

router.delete('/account', requireEmailVerification, userController.deleteAccount);

module.exports = router;