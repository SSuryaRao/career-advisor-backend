/**
 * Script to fix/reset quota for upgraded users
 * This will reset the quota to match their current subscription tier
 *
 * Run: node fix-user-quota.js <email>
 * Example: node fix-user-quota.js saytosubhamkumar@gmail.com
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const UsageQuota = require('./src/models/UsageQuota');
const { TIER_LIMITS } = require('./src/config/tierLimits');
require('dotenv').config();

async function fixUserQuota(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`👤 User: ${user.email}`);
    console.log(`📊 Current Tier: ${user.subscription?.plan || 'free'}`);
    console.log(`🔐 Subscription Status: ${user.subscription?.status || 'none'}\n`);

    const userTier = user.subscription?.plan || 'free';
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Find existing quota
    const existingQuota = await UsageQuota.findOne({
      userId: user._id,
      month: currentMonth
    });

    if (existingQuota) {
      console.log('📋 Current Quota:');
      console.log(`   Resume Analysis: ${existingQuota.resumeAnalysis?.used || 0}/${existingQuota.resumeAnalysis?.limit}`);
      console.log(`   Resume Improvement: ${existingQuota.resumeImprovement?.used || 0}/${existingQuota.resumeImprovement?.limit}`);
      console.log(`   AI Mentor Messages: ${existingQuota.aiMentorMessages?.used || 0}/${existingQuota.aiMentorMessages?.limit}`);
      console.log(`   Video Interviews: ${existingQuota.intelligentInterviewVideo?.used || 0}/${existingQuota.intelligentInterviewVideo?.limit}`);
      console.log('\n🔄 Deleting old quota...');
      await UsageQuota.findByIdAndDelete(existingQuota._id);
    }

    // Create new quota with correct tier limits
    const tierLimits = TIER_LIMITS[userTier];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    const quotaData = {
      userId: user._id,
      month: currentMonth,
      tier: userTier,
      resetDate: nextMonth
    };

    // Set all feature limits
    Object.keys(tierLimits).forEach(feature => {
      quotaData[feature] = {
        used: 0, // Reset to 0
        limit: tierLimits[feature]
      };
    });

    const newQuota = await UsageQuota.create(quotaData);

    console.log('✅ New Quota Created:');
    console.log(`   Tier: ${userTier}`);
    console.log(`   Resume Analysis: 0/${newQuota.resumeAnalysis?.limit === -1 ? 'Unlimited' : newQuota.resumeAnalysis?.limit}`);
    console.log(`   Resume Improvement: 0/${newQuota.resumeImprovement?.limit === -1 ? 'Unlimited' : newQuota.resumeImprovement?.limit}`);
    console.log(`   Resume Builder: 0/${newQuota.resumeBuilder?.limit === -1 ? 'Unlimited' : newQuota.resumeBuilder?.limit}`);
    console.log(`   AI Mentor Messages: 0/${newQuota.aiMentorMessages?.limit === -1 ? 'Unlimited' : newQuota.aiMentorMessages?.limit}`);
    console.log(`   Video Interviews: 0/${newQuota.intelligentInterviewVideo?.limit === -1 ? 'Unlimited' : newQuota.intelligentInterviewVideo?.limit}`);
    console.log(`   Job Recommendations: 0/${newQuota.jobRecommendations?.limit === -1 ? 'Unlimited' : newQuota.jobRecommendations?.limit}`);
    console.log(`\n🎉 Quota reset successfully!`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide user email');
  console.log('Usage: node fix-user-quota.js <email>');
  console.log('Example: node fix-user-quota.js user@example.com');
  process.exit(1);
}

fixUserQuota(email);
