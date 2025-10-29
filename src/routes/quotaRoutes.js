const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { getRemainingQuota } = require('../middleware/usageLimits');
const { requireAdmin } = require('../middleware/adminMiddleware');
const UsageQuota = require('../models/UsageQuota');
const User = require('../models/User');

/**
 * GET /api/quota/me
 * Get current user's quota and usage
 */
router.get('/me', authenticateUser, getRemainingQuota);

/**
 * GET /api/quota/history
 * Get user's quota history (last 6 months)
 */
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get last 6 months
    const quotas = await UsageQuota.find({ userId: user._id })
      .sort({ month: -1 })
      .limit(6);

    res.json({
      success: true,
      history: quotas.map(q => ({
        month: q.month,
        tier: q.tier,
        resetDate: q.resetDate,
        usage: Object.keys(q.toObject()).filter(key =>
          !['_id', 'userId', 'month', 'tier', 'resetDate', 'createdAt', 'updatedAt', '__v'].includes(key)
        ).reduce((acc, feature) => {
          if (q[feature] && typeof q[feature] === 'object') {
            acc[feature] = {
              used: q[feature].used,
              limit: q[feature].limit
            };
          }
          return acc;
        }, {})
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching quota history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quota history',
      message: error.message
    });
  }
});

/**
 * GET /api/quota/admin/all
 * Admin: Get all users' quota usage
 */
router.get('/admin/all', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { tier, limit = 50, skip = 0 } = req.query;

    const filter = { month: currentMonth };
    if (tier) {
      filter.tier = tier;
    }

    const quotas = await UsageQuota.find(filter)
      .populate('userId', 'name email subscription')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ 'userId.email': 1 });

    const total = await UsageQuota.countDocuments(filter);

    res.json({
      success: true,
      quotas: quotas.map(q => ({
        user: {
          id: q.userId._id,
          name: q.userId.name,
          email: q.userId.email,
          tier: q.userId.subscription?.plan || 'free'
        },
        month: q.month,
        tier: q.tier,
        resetDate: q.resetDate,
        topUsage: getTopUsage(q)
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: skip + quotas.length < total
      }
    });
  } catch (error) {
    console.error('❌ Error fetching all quotas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quota data',
      message: error.message
    });
  }
});

/**
 * GET /api/quota/admin/stats
 * Admin: Get quota usage statistics
 */
router.get('/admin/stats', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const stats = await UsageQuota.aggregate([
      { $match: { month: currentMonth } },
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          avgResumeAnalysis: { $avg: '$resumeAnalysis.used' },
          avgAiMentorMessages: { $avg: '$aiMentorMessages.used' },
          avgVideoInterviews: { $avg: '$intelligentInterviewVideo.used' }
        }
      }
    ]);

    res.json({
      success: true,
      month: currentMonth,
      stats: stats.map(s => ({
        tier: s._id,
        totalUsers: s.count,
        averageUsage: {
          resumeAnalysis: Math.round(s.avgResumeAnalysis || 0),
          aiMentorMessages: Math.round(s.avgAiMentorMessages || 0),
          videoInterviews: Math.round(s.avgVideoInterviews || 0)
        }
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching quota stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/quota/admin/reset/:userId
 * Admin: Reset a user's quota (emergency use only)
 */
router.post('/admin/reset/:userId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const quota = await UsageQuota.findOne({ userId, month: currentMonth });

    if (!quota) {
      return res.status(404).json({
        success: false,
        error: 'Quota not found for this month'
      });
    }

    // Reset all usage to 0
    Object.keys(quota.toObject()).forEach(key => {
      if (quota[key] && typeof quota[key] === 'object' && quota[key].used !== undefined) {
        quota[key].used = 0;
      }
    });

    await quota.save();

    console.log(`🔄 Admin ${req.adminUser.email} reset quota for user ${userId}`);

    res.json({
      success: true,
      message: 'Quota reset successfully',
      quota
    });
  } catch (error) {
    console.error('❌ Error resetting quota:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset quota',
      message: error.message
    });
  }
});

// Helper function to get top usage features
function getTopUsage(quota) {
  const usage = {};

  Object.keys(quota.toObject()).forEach(key => {
    if (quota[key] && typeof quota[key] === 'object' && quota[key].used !== undefined) {
      usage[key] = {
        used: quota[key].used,
        limit: quota[key].limit,
        percentage: quota[key].limit === -1 ? 0 : Math.round((quota[key].used / quota[key].limit) * 100)
      };
    }
  });

  // Return top 5 most used features
  return Object.entries(usage)
    .sort((a, b) => b[1].used - a[1].used)
    .slice(0, 5)
    .reduce((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
}

module.exports = router;
