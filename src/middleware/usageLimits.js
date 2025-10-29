const UsageQuota = require('../models/UsageQuota');
const User = require('../models/User');
const { TIER_LIMITS } = require('../config/tierLimits');

/**
 * Get or create usage quota for current month
 */
async function getOrCreateQuota(userId, userTier) {
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  let quota = await UsageQuota.findOne({ userId, month: currentMonth });

  if (!quota) {
    // Create new quota for this month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    const tierLimits = TIER_LIMITS[userTier];
    const quotaData = {
      userId,
      month: currentMonth,
      tier: userTier,
      resetDate: nextMonth
    };

    // Add all feature limits
    Object.keys(tierLimits).forEach(feature => {
      quotaData[feature] = {
        used: 0,
        limit: tierLimits[feature]
      };
    });

    quota = await UsageQuota.create(quotaData);
  }

  return quota;
}

/**
 * Middleware to check usage limits before allowing access to a feature
 */
function checkUsageLimit(featureName) {
  return async (req, res, next) => {
    try {
      console.log(`🔍 Checking usage limit for feature: ${featureName}`);

      // Get user from database (has subscription info)
      const user = await User.findOne({ firebaseUid: req.user.uid });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Admins bypass all limits
      if (user.isAdmin) {
        console.log(`🔓 Admin bypass: ${user.email} accessing ${featureName}`);
        req.userTier = 'admin';
        req.userId = user._id;
        return next();
      }

      const userTier = user.subscription?.plan || 'free';
      const quota = await getOrCreateQuota(user._id, userTier);

      const feature = quota[featureName];

      // Check if feature exists
      if (!feature) {
        console.error(`❌ Invalid feature: ${featureName}`);
        return res.status(500).json({
          success: false,
          error: 'Invalid feature configuration'
        });
      }

      // -1 means unlimited
      if (feature.limit === -1) {
        console.log(`✅ Unlimited access: ${user.email} (${userTier}) - ${featureName}`);
        req.userTier = userTier;
        req.userId = user._id;
        req.quota = quota;
        req.featureName = featureName;
        return next();
      }

      // Check if limit of 0 (feature not available)
      if (feature.limit === 0) {
        console.log(`🚫 Feature blocked: ${user.email} (${userTier}) tried to use ${featureName} (limit: 0)`);
        return res.status(403).json({
          success: false,
          error: 'Feature not available',
          message: `This feature is not available in your ${userTier} plan`,
          upgradeRequired: userTier === 'free' ? 'premium' : 'pro',
          feature: featureName
        });
      }

      // Check if limit reached
      if (feature.used >= feature.limit) {
        console.log(`⚠️ Limit exceeded: ${user.email} (${userTier}) - ${featureName} (${feature.used}/${feature.limit})`);
        return res.status(429).json({
          success: false,
          error: 'Usage limit exceeded',
          message: `You've reached your monthly limit for ${featureName}`,
          limit: feature.limit,
          used: feature.used,
          resetDate: quota.resetDate,
          upgradeRequired: userTier === 'free' ? 'premium' : 'pro',
          feature: featureName
        });
      }

      // All good, attach data to request
      console.log(`✅ Quota check passed: ${user.email} (${userTier}) - ${featureName} (${feature.used + 1}/${feature.limit})`);
      req.userTier = userTier;
      req.userId = user._id;
      req.quota = quota;
      req.featureName = featureName;

      next();
    } catch (error) {
      console.error('❌ Usage limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check usage limits',
        message: error.message
      });
    }
  };
}

/**
 * Middleware to increment usage (call AFTER successful operation)
 */
async function incrementUsage(req, res, next) {
  try {
    await incrementUsageForRequest(req);
    if (next) next();
  } catch (error) {
    console.error('❌ Failed to increment usage:', error);
    // Don't fail the request if usage tracking fails
    if (next) next();
  }
}

/**
 * Helper function to increment usage (can be called directly)
 */
async function incrementUsageForRequest(req) {
  try {
    if (req.userTier === 'admin') {
      return; // Admins don't consume quota
    }

    if (req.quota && req.featureName) {
      const feature = req.quota[req.featureName];

      // Only increment if not unlimited
      if (feature && feature.limit !== -1) {
        await UsageQuota.findByIdAndUpdate(
          req.quota._id,
          { $inc: { [`${req.featureName}.used`]: 1 } }
        );
        console.log(`📊 Usage incremented: ${req.featureName} (${feature.used + 1}/${feature.limit})`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to increment usage:', error);
    // Don't fail the request if usage tracking fails
  }
}

/**
 * Get remaining quota for user
 */
async function getRemainingQuota(req, res) {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isAdmin) {
      return res.json({
        success: true,
        tier: 'admin',
        unlimited: true,
        message: 'Admin users have unlimited access to all features'
      });
    }

    const userTier = user.subscription?.plan || 'free';
    const quota = await getOrCreateQuota(user._id, userTier);

    // Format response
    const remaining = {};
    Object.keys(TIER_LIMITS[userTier]).forEach(feature => {
      const limit = quota[feature]?.limit || 0;
      const used = quota[feature]?.used || 0;

      remaining[feature] = {
        limit: limit === -1 ? 'unlimited' : limit,
        used,
        remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - used),
        percentUsed: limit === -1 ? 0 : Math.round((used / limit) * 100)
      };
    });

    res.json({
      success: true,
      tier: userTier,
      month: quota.month,
      resetDate: quota.resetDate,
      quotas: remaining
    });
  } catch (error) {
    console.error('❌ Get quota error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quota information',
      message: error.message
    });
  }
}

module.exports = {
  checkUsageLimit,
  incrementUsage,
  incrementUsageForRequest,
  getRemainingQuota,
  getOrCreateQuota
};
