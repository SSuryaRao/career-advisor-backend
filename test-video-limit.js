/**
 * Test script to verify intelligent interview video limit
 *
 * Run: node test-video-limit.js
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const UsageQuota = require('./src/models/UsageQuota');
const { TIER_LIMITS } = require('./src/config/tierLimits');
require('dotenv').config();

async function testVideoLimit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test with a specific user (replace with actual test user email)
    const testEmail = 'manabbehera9178@gmail.com'; // Free user

    const user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log(`❌ User not found: ${testEmail}`);
      process.exit(1);
    }

    console.log(`👤 Testing user: ${user.email}`);
    console.log(`📊 Tier: ${user.subscription?.plan || 'free'}`);
    console.log(`🔐 Admin: ${user.isAdmin}\n`);

    const userTier = user.subscription?.plan || 'free';
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get or create quota
    let quota = await UsageQuota.findOne({ userId: user._id, month: currentMonth });

    if (!quota) {
      console.log('📝 Creating new quota for current month...');
      const tierLimits = TIER_LIMITS[userTier];
      const quotaData = {
        userId: user._id,
        month: currentMonth,
        tier: userTier,
        resetDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      };

      Object.keys(tierLimits).forEach(feature => {
        quotaData[feature] = {
          used: 0,
          limit: tierLimits[feature]
        };
      });

      quota = await UsageQuota.create(quotaData);
    }

    console.log('\n📋 Video Interview Quota:');
    console.log(`   Feature: intelligentInterviewVideo`);
    console.log(`   Limit: ${quota.intelligentInterviewVideo?.limit === -1 ? 'Unlimited' : quota.intelligentInterviewVideo?.limit || 0}`);
    console.log(`   Used: ${quota.intelligentInterviewVideo?.used || 0}`);
    console.log(`   Remaining: ${quota.intelligentInterviewVideo?.limit === -1 ? 'Unlimited' : Math.max(0, (quota.intelligentInterviewVideo?.limit || 0) - (quota.intelligentInterviewVideo?.used || 0))}`);

    // Check if would be blocked
    const videoLimit = quota.intelligentInterviewVideo?.limit || 0;
    const videoUsed = quota.intelligentInterviewVideo?.used || 0;

    console.log('\n🔍 Limit Check Simulation:');
    if (user.isAdmin) {
      console.log('   ✅ ADMIN - Would bypass all limits');
    } else if (videoLimit === -1) {
      console.log('   ✅ UNLIMITED - Would allow request');
    } else if (videoLimit === 0) {
      console.log('   🚫 BLOCKED - Feature not available in this tier (limit: 0)');
      console.log(`   → Should return 403 with upgrade required message`);
    } else if (videoUsed >= videoLimit) {
      console.log(`   🚫 BLOCKED - Limit exceeded (${videoUsed}/${videoLimit})`);
      console.log(`   → Should return 429 with usage limit exceeded message`);
    } else {
      console.log(`   ✅ ALLOWED - Within limits (${videoUsed}/${videoLimit})`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Test complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testVideoLimit();
