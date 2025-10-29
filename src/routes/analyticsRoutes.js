/**
 * Analytics Routes
 *
 * API endpoints for BigQuery data sync and insights retrieval
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// All analytics routes require admin access
router.use(authenticateUser);
router.use(requireAdmin);

// Sync endpoints
router.post('/sync/all', analyticsController.syncAllData);
router.post('/sync/incremental', analyticsController.incrementalSync);

// Insights endpoints
router.get('/insights/:type', analyticsController.getInsights);
router.get('/admin/dashboard', analyticsController.getAdminDashboard);

module.exports = router;
