/**
 * Analytics Controller
 *
 * Handles BigQuery sync and insights retrieval for Career Insights Dashboard
 */

const bigQueryService = require('../services/bigQueryService');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const RoadmapProgress = require('../models/RoadmapProgress');
const MockInterviewProgress = require('../models/MockInterviewProgress');
const Analytics = require('../models/Analytics');
const Resume = require('../models/Resume');

/**
 * Sync all data to BigQuery
 */
const syncAllData = async (req, res) => {
  try {
    console.log('🔄 Starting full data sync to BigQuery...');

    const results = {
      userActivities: 0,
      atsScores: 0,
      skillsTrends: 0,
      roiMetrics: 0,
      scholarshipApplications: 0,
      resourceEngagement: 0,
      roadmapProgress: 0,
      mockInterviewPerformance: 0
    };

    // 1. Sync User Activities
    const users = await User.find({ isActive: true }).limit(1000);
    const userActivities = users.map(user => ({
      userId: user.firebaseUid || user._id.toString(),
      userName: user.name,
      email: user.email,
      careerDomain: user.profile?.careerGoal || null,
      skillLevel: user.skills.length > 0 ? 'intermediate' : 'beginner',
      location: user.profile?.location || null,
      state: extractState(user.profile?.location),
      activityType: 'profile_update',
      activityDetails: {
        skillsCount: user.skills.length,
        interests: user.profile?.interests || []
      },
      timestamp: user.updatedAt || user.createdAt
    }));

    if (userActivities.length > 0) {
      const result = await bigQueryService.syncUserActivities(userActivities);
      results.userActivities = result.inserted;
    }

    // 2. Sync ATS Scores from Resume collection
    const resumes = await Resume.find({ atsScore: { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(1000);

    const atsScores = resumes.map(resume => ({
      userId: resume.userId,
      resumeId: resume._id.toString(),
      score: resume.atsScore || 0,
      previousScore: null,
      improvement: null,
      category: resume.analysis?.category || 'general',
      suggestions: resume.analysis?.suggestions || null,
      timestamp: resume.createdAt
    }));

    if (atsScores.length > 0) {
      const result = await bigQueryService.syncAtsScores(atsScores);
      results.atsScores = result.inserted;
    }

    // 3. Sync Skills Trends
    const skillsAggregation = await User.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills.name',
          userCount: { $sum: 1 },
          avgLevel: { $avg: { $cond: [
            { $eq: ['$skills.level', 'beginner'] }, 1,
            { $cond: [
              { $eq: ['$skills.level', 'intermediate'] }, 2,
              { $cond: [
                { $eq: ['$skills.level', 'advanced'] }, 3, 4
              ]}
            ]}
          ]}}
        }
      },
      { $sort: { userCount: -1 } },
      { $limit: 50 }
    ]);

    const skillsTrends = skillsAggregation.map(skill => ({
      skillName: skill._id,
      category: categorizeSkill(skill._id),
      userCount: skill.userCount,
      avgProficiency: mapLevelToString(skill.avgLevel),
      demandScore: calculateDemandScore(skill.userCount),
      trendDirection: 'rising',
      monthYear: bigQueryService.getCurrentMonthYear()
    }));

    if (skillsTrends.length > 0) {
      const result = await bigQueryService.syncSkillsTrends(skillsTrends);
      results.skillsTrends = result.inserted;
    }

    // 4. Sync ROI Metrics
    const roadmaps = await RoadmapProgress.find({}).select('careerDomain completedMilestones updatedAt userId');
    const roiByDomain = {};

    for (const roadmap of roadmaps) {
      const domain = roadmap.careerDomain;
      if (!roiByDomain[domain]) {
        roiByDomain[domain] = {
          careerDomain: domain,
          totalUsers: 0,
          totalCompletion: 0,
          atsScores: [],
          mockScores: []
        };
      }

      roiByDomain[domain].totalUsers++;

      // Get ATS score for this user
      const userResume = resumes.find(r => r.userId === roadmap.userId);
      if (userResume && userResume.atsScore) {
        roiByDomain[domain].atsScores.push(userResume.atsScore);
      }

      // Get mock interview score for this user
      const mockProgress = await MockInterviewProgress.findOne({ userId: roadmap.userId });
      if (mockProgress) {
        const avgScore = mockProgress.getStats().avgAptitudeScore;
        if (avgScore > 0) {
          roiByDomain[domain].mockScores.push(avgScore);
        }
      }
    }

    const roiMetrics = Object.values(roiByDomain).map(roi => ({
      careerDomain: roi.careerDomain,
      totalUsers: roi.totalUsers,
      avgCompletionRate: 0, // Calculate from roadmap progress
      avgAtsScore: roi.atsScores.length > 0 ? average(roi.atsScores) : null,
      avgMockInterviewScore: roi.mockScores.length > 0 ? average(roi.mockScores) : null,
      jobApplications: 0, // TODO: Add when job application tracking is implemented
      successRate: null,
      avgTimeToComplete: null,
      monthYear: bigQueryService.getCurrentMonthYear()
    }));

    if (roiMetrics.length > 0) {
      const result = await bigQueryService.syncRoiMetrics(roiMetrics);
      results.roiMetrics = result.inserted;
    }

    // 5. Sync Resource Engagement
    const userProgresses = await UserProgress.find({}).limit(500);
    const resourceEngagements = [];

    for (const progress of userProgresses) {
      for (const resource of progress.completedResources) {
        resourceEngagements.push({
          userId: progress.userId,
          resourceId: resource.resourceId.toString(),
          resourceTitle: null, // Will be enriched from resources data
          category: resource.category,
          completionStatus: true,
          timeSpent: resource.timeSpent || 0,
          rating: resource.rating || null,
          timestamp: resource.completedAt
        });
      }
    }

    if (resourceEngagements.length > 0) {
      const result = await bigQueryService.syncResourceEngagement(resourceEngagements.slice(0, 1000));
      results.resourceEngagement = result.inserted;
    }

    // 6. Sync Roadmap Progress
    const roadmapProgressData = await RoadmapProgress.find({}).limit(1000);
    const roadmapProgressRows = roadmapProgressData.map(roadmap => {
      const totalMilestones = roadmap.roadmapData?.stages?.reduce(
        (total, stage) => total + (stage.milestones?.length || 0), 0
      ) || 0;
      const completedMilestones = roadmap.completedMilestones?.length || 0;
      const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

      return {
        userId: roadmap.userId,
        roadmapId: roadmap._id.toString(),
        careerDomain: roadmap.careerDomain,
        skillLevel: roadmap.skillLevel || 'beginner',
        totalMilestones,
        completedMilestones,
        progressPercentage,
        lastActivity: roadmap.updatedAt,
        timestamp: roadmap.createdAt
      };
    });

    if (roadmapProgressRows.length > 0) {
      const result = await bigQueryService.syncRoadmapProgress(roadmapProgressRows);
      results.roadmapProgress = result.inserted;
    }

    // 7. Sync Mock Interview Performance
    const mockInterviews = await MockInterviewProgress.find({}).limit(500);
    const mockPerformances = [];

    for (const mock of mockInterviews) {
      // Add aptitude test results
      for (const test of mock.aptitudeTests) {
        mockPerformances.push({
          userId: mock.userId,
          sessionId: test._id?.toString(),
          testType: test.testType,
          score: test.score,
          totalQuestions: test.totalQuestions || null,
          correctAnswers: test.correctAnswers || null,
          timeSpent: test.timeSpent || null,
          difficulty: test.difficulty || 'medium',
          timestamp: test.completedAt
        });
      }
    }

    if (mockPerformances.length > 0) {
      const result = await bigQueryService.syncMockInterviewPerformance(mockPerformances.slice(0, 1000));
      results.mockInterviewPerformance = result.inserted;
    }

    console.log('✅ Data sync completed:', results);

    res.status(200).json({
      success: true,
      message: 'Data synced successfully to BigQuery',
      data: results
    });
  } catch (error) {
    console.error('❌ Error syncing data to BigQuery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync data to BigQuery',
      error: error.message
    });
  }
};

/**
 * Get insights from BigQuery
 */
const getInsights = async (req, res) => {
  try {
    const { type } = req.params;
    const params = req.query;

    const data = await bigQueryService.getInsights(type, params);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error(`❌ Error fetching insights for ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights',
      error: error.message
    });
  }
};

/**
 * Get admin dashboard summary
 */
const getAdminDashboard = async (req, res) => {
  try {
    // Fetch all insights with error handling
    const [
      careerDomains,
      topSkills,
      atsImprovement,
      studentsByState,
      roiComparison,
      scholarshipStats
    ] = await Promise.allSettled([
      bigQueryService.getInsights('career_domains').catch(() => []),
      bigQueryService.getInsights('top_skills').catch(() => []),
      bigQueryService.getInsights('ats_improvement').catch(() => []),
      bigQueryService.getInsights('students_by_state').catch(() => []),
      bigQueryService.getInsights('roi_comparison').catch(() => []),
      bigQueryService.getInsights('scholarship_stats').catch(() => [])
    ]);

    res.status(200).json({
      success: true,
      data: {
        careerDomains: careerDomains.status === 'fulfilled' ? careerDomains.value : [],
        topSkills: topSkills.status === 'fulfilled' ? topSkills.value : [],
        atsImprovement: atsImprovement.status === 'fulfilled' ? atsImprovement.value : [],
        studentsByState: studentsByState.status === 'fulfilled' ? studentsByState.value : [],
        roiComparison: roiComparison.status === 'fulfilled' ? roiComparison.value : [],
        scholarshipStats: scholarshipStats.status === 'fulfilled' ? scholarshipStats.value : []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin dashboard',
      error: error.message
    });
  }
};

/**
 * Trigger incremental sync (for recent data)
 */
const incrementalSync = async (req, res) => {
  try {
    const { dataType } = req.body;

    // Sync only recent data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let result;

    switch (dataType) {
      case 'user_activities':
        const recentUsers = await User.find({
          updatedAt: { $gte: sevenDaysAgo },
          isActive: true
        }).limit(100);

        const activities = recentUsers.map(user => ({
          userId: user.firebaseUid || user._id.toString(),
          userName: user.name,
          email: user.email,
          careerDomain: user.profile?.careerGoal || null,
          skillLevel: user.skills.length > 0 ? 'intermediate' : 'beginner',
          location: user.profile?.location || null,
          state: extractState(user.profile?.location),
          activityType: 'profile_update',
          activityDetails: {
            skillsCount: user.skills.length,
            interests: user.profile?.interests || []
          },
          timestamp: user.updatedAt
        }));

        result = await bigQueryService.syncUserActivities(activities);
        break;

      case 'ats_scores':
        const recentResumes = await Resume.find({
          createdAt: { $gte: sevenDaysAgo },
          atsScore: { $exists: true }
        }).limit(100);

        const scores = recentResumes.map(resume => ({
          userId: resume.userId,
          resumeId: resume._id.toString(),
          score: resume.atsScore || 0,
          category: resume.analysis?.category || 'general',
          timestamp: resume.createdAt
        }));

        result = await bigQueryService.syncAtsScores(scores);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid data type'
        });
    }

    res.status(200).json({
      success: true,
      message: 'Incremental sync completed',
      data: result
    });
  } catch (error) {
    console.error('❌ Error in incremental sync:', error);
    res.status(500).json({
      success: false,
      message: 'Incremental sync failed',
      error: error.message
    });
  }
};

// Helper functions
function extractState(location) {
  if (!location) return null;
  // Simple state extraction - can be enhanced with proper geocoding
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  for (const state of states) {
    if (location.toUpperCase().includes(state)) {
      return state;
    }
  }
  return null;
}

function categorizeSkill(skillName) {
  const categories = {
    programming: ['javascript', 'python', 'java', 'c++', 'ruby', 'go', 'rust'],
    web: ['react', 'angular', 'vue', 'html', 'css', 'nodejs'],
    data: ['sql', 'mongodb', 'postgresql', 'redis', 'bigquery'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
    ai: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp']
  };

  const lowerSkill = skillName.toLowerCase();
  for (const [category, skills] of Object.entries(categories)) {
    if (skills.some(s => lowerSkill.includes(s))) {
      return category;
    }
  }
  return 'other';
}

function mapLevelToString(avgLevel) {
  if (avgLevel < 1.5) return 'beginner';
  if (avgLevel < 2.5) return 'intermediate';
  if (avgLevel < 3.5) return 'advanced';
  return 'expert';
}

function calculateDemandScore(userCount) {
  // Simple demand score calculation (0-100)
  return Math.min(100, userCount * 5);
}

function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

module.exports = {
  syncAllData,
  getInsights,
  getAdminDashboard,
  incrementalSync
};
