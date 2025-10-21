/**
 * Data Sync Service
 *
 * Automated service to sync data from MongoDB to BigQuery
 * Runs on a schedule using node-cron
 */

const cron = require('node-cron');
const bigQueryService = require('./bigQueryService');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const RoadmapProgress = require('../models/RoadmapProgress');
const MockInterviewProgress = require('../models/MockInterviewProgress');
const Resume = require('../models/Resume');

class DataSyncService {
  constructor() {
    this.isRunning = false;
    this.lastSync = null;
    this.syncHistory = [];
  }

  /**
   * Initialize cron jobs
   */
  initializeCronJobs() {
    console.log('🕐 Initializing data sync cron jobs...');

    // Daily full sync at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('⏰ Running scheduled daily full sync...');
      await this.fullSync();
    });

    // Hourly incremental sync for recent data
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running scheduled hourly incremental sync...');
      await this.incrementalSync(60); // Last 60 minutes
    });

    // Weekly aggregated metrics calculation (Sunday at 3 AM)
    cron.schedule('0 3 * * 0', async () => {
      console.log('⏰ Running scheduled weekly metrics aggregation...');
      await this.calculateWeeklyMetrics();
    });

    console.log('✅ Cron jobs initialized successfully');
    console.log('   - Daily full sync: 2:00 AM');
    console.log('   - Hourly incremental sync: Every hour');
    console.log('   - Weekly metrics: Sunday 3:00 AM');
  }

  /**
   * Full data sync - syncs all data
   */
  async fullSync() {
    if (this.isRunning) {
      console.log('⚠️ Sync already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      const startTime = Date.now();
      console.log('🔄 Starting full data sync...');

      const results = {
        userActivities: 0,
        atsScores: 0,
        skillsTrends: 0,
        roiMetrics: 0,
        resourceEngagement: 0,
        roadmapProgress: 0,
        mockInterviewPerformance: 0
      };

      // 1. Sync User Activities
      const users = await User.find({ isActive: true })
        .sort({ updatedAt: -1 })
        .limit(5000);

      const userActivities = users.map(user => ({
        userId: user.firebaseUid || user._id.toString(),
        userName: user.name,
        email: user.email,
        careerDomain: user.profile?.careerGoal || null,
        skillLevel: user.skills.length > 0 ? 'intermediate' : 'beginner',
        location: user.profile?.location || null,
        state: this.extractState(user.profile?.location),
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

      // 2. Sync ATS Scores
      const resumes = await Resume.find({ atsScore: { $exists: true } })
        .sort({ createdAt: -1 })
        .limit(5000);

      const atsScores = resumes.map(resume => ({
        userId: resume.userId,
        resumeId: resume._id.toString(),
        score: resume.atsScore || 0,
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
            avgLevel: {
              $avg: {
                $cond: [
                  { $eq: ['$skills.level', 'beginner'] }, 1,
                  {
                    $cond: [
                      { $eq: ['$skills.level', 'intermediate'] }, 2,
                      { $cond: [{ $eq: ['$skills.level', 'advanced'] }, 3, 4] }
                    ]
                  }
                ]
              }
            }
          }
        },
        { $sort: { userCount: -1 } },
        { $limit: 100 }
      ]);

      const skillsTrends = skillsAggregation.map(skill => ({
        skillName: skill._id,
        category: this.categorizeSkill(skill._id),
        userCount: skill.userCount,
        avgProficiency: this.mapLevelToString(skill.avgLevel),
        demandScore: this.calculateDemandScore(skill.userCount),
        trendDirection: 'stable',
        monthYear: bigQueryService.getCurrentMonthYear()
      }));

      if (skillsTrends.length > 0) {
        const result = await bigQueryService.syncSkillsTrends(skillsTrends);
        results.skillsTrends = result.inserted;
      }

      // 4. Sync Resource Engagement
      const userProgresses = await UserProgress.find({})
        .sort({ updatedAt: -1 })
        .limit(2000);

      const resourceEngagements = [];
      for (const progress of userProgresses) {
        for (const resource of progress.completedResources.slice(0, 50)) {
          resourceEngagements.push({
            userId: progress.userId,
            resourceId: resource.resourceId.toString(),
            resourceTitle: null,
            category: resource.category,
            completionStatus: true,
            timeSpent: resource.timeSpent || 0,
            rating: resource.rating || null,
            timestamp: resource.completedAt
          });
        }
      }

      if (resourceEngagements.length > 0) {
        const result = await bigQueryService.syncResourceEngagement(resourceEngagements);
        results.resourceEngagement = result.inserted;
      }

      // 5. Sync Roadmap Progress
      const roadmaps = await RoadmapProgress.find({})
        .sort({ updatedAt: -1 })
        .limit(5000);

      const roadmapProgressData = roadmaps.map(roadmap => {
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

      if (roadmapProgressData.length > 0) {
        const result = await bigQueryService.syncRoadmapProgress(roadmapProgressData);
        results.roadmapProgress = result.inserted;
      }

      // 6. Sync Mock Interview Performance
      const mockInterviews = await MockInterviewProgress.find({})
        .sort({ updatedAt: -1 })
        .limit(2000);

      const mockPerformances = [];
      for (const mock of mockInterviews) {
        for (const test of mock.aptitudeTests.slice(0, 20)) {
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
        const result = await bigQueryService.syncMockInterviewPerformance(mockPerformances);
        results.mockInterviewPerformance = result.inserted;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.lastSync = new Date();

      const syncRecord = {
        type: 'full',
        timestamp: this.lastSync,
        duration: `${duration}s`,
        results
      };

      this.syncHistory.unshift(syncRecord);
      if (this.syncHistory.length > 10) {
        this.syncHistory = this.syncHistory.slice(0, 10);
      }

      console.log('✅ Full sync completed:', results);
      console.log(`⏱️ Duration: ${duration}s`);

      return syncRecord;
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Incremental sync - syncs only recent data
   */
  async incrementalSync(minutesBack = 60) {
    if (this.isRunning) {
      console.log('⚠️ Sync already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      const startTime = Date.now();
      console.log(`🔄 Starting incremental sync (last ${minutesBack} minutes)...`);

      const sinceDate = new Date(Date.now() - minutesBack * 60 * 1000);

      const results = {
        userActivities: 0,
        atsScores: 0,
        resourceEngagement: 0,
        roadmapProgress: 0,
        mockInterviewPerformance: 0
      };

      // Sync only recently updated data
      const recentUsers = await User.find({
        updatedAt: { $gte: sinceDate },
        isActive: true
      });

      if (recentUsers.length > 0) {
        const userActivities = recentUsers.map(user => ({
          userId: user.firebaseUid || user._id.toString(),
          userName: user.name,
          email: user.email,
          careerDomain: user.profile?.careerGoal || null,
          skillLevel: user.skills.length > 0 ? 'intermediate' : 'beginner',
          location: user.profile?.location || null,
          state: this.extractState(user.profile?.location),
          activityType: 'profile_update',
          activityDetails: {
            skillsCount: user.skills.length,
            interests: user.profile?.interests || []
          },
          timestamp: user.updatedAt
        }));

        const result = await bigQueryService.syncUserActivities(userActivities);
        results.userActivities = result.inserted;
      }

      // Sync recent resumes
      const recentResumes = await Resume.find({
        createdAt: { $gte: sinceDate },
        atsScore: { $exists: true }
      });

      if (recentResumes.length > 0) {
        const atsScores = recentResumes.map(resume => ({
          userId: resume.userId,
          resumeId: resume._id.toString(),
          score: resume.atsScore || 0,
          category: resume.analysis?.category || 'general',
          timestamp: resume.createdAt
        }));

        const result = await bigQueryService.syncAtsScores(atsScores);
        results.atsScores = result.inserted;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      const syncRecord = {
        type: 'incremental',
        timestamp: new Date(),
        duration: `${duration}s`,
        minutesBack,
        results
      };

      console.log('✅ Incremental sync completed:', results);
      console.log(`⏱️ Duration: ${duration}s`);

      return syncRecord;
    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Calculate and sync weekly aggregated metrics
   */
  async calculateWeeklyMetrics() {
    try {
      console.log('🔄 Calculating weekly metrics...');

      // Calculate ROI metrics by career domain
      const roadmaps = await RoadmapProgress.find({});
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

        // Get associated metrics
        const userResume = await Resume.findOne({ userId: roadmap.userId });
        if (userResume && userResume.atsScore) {
          roiByDomain[domain].atsScores.push(userResume.atsScore);
        }

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
        avgCompletionRate: 0,
        avgAtsScore: roi.atsScores.length > 0 ? this.average(roi.atsScores) : null,
        avgMockInterviewScore: roi.mockScores.length > 0 ? this.average(roi.mockScores) : null,
        jobApplications: 0,
        successRate: null,
        avgTimeToComplete: null,
        monthYear: bigQueryService.getCurrentMonthYear()
      }));

      if (roiMetrics.length > 0) {
        await bigQueryService.syncRoiMetrics(roiMetrics);
        console.log(`✅ Synced ${roiMetrics.length} ROI metrics`);
      }
    } catch (error) {
      console.error('❌ Weekly metrics calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSync,
      history: this.syncHistory
    };
  }

  // Helper methods
  extractState(location) {
    if (!location) return null;
    const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
    for (const state of states) {
      if (location.toUpperCase().includes(state)) {
        return state;
      }
    }
    return null;
  }

  categorizeSkill(skillName) {
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

  mapLevelToString(avgLevel) {
    if (avgLevel < 1.5) return 'beginner';
    if (avgLevel < 2.5) return 'intermediate';
    if (avgLevel < 3.5) return 'advanced';
    return 'expert';
  }

  calculateDemandScore(userCount) {
    return Math.min(100, userCount * 5);
  }

  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
}

// Export singleton instance
const dataSyncService = new DataSyncService();
module.exports = dataSyncService;
