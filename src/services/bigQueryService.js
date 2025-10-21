/**
 * BigQuery Service
 *
 * Handles all BigQuery operations for Career Insights Dashboard
 */

const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const { DATASET_ID, PROJECT_ID, schemas, tableConfigurations } = require('../config/bigQuerySchema');

// Initialize BigQuery client
// Try to use credentials file if it exists, otherwise use application default credentials
let bigqueryOptions = {
  projectId: PROJECT_ID
};

const keyFilePath = path.join(__dirname, '../../credentials/service-account-key.json');
const fs = require('fs');

if (fs.existsSync(keyFilePath)) {
  bigqueryOptions.keyFilename = keyFilePath;
  console.log('Using service account key file for BigQuery');
} else {
  // Use application default credentials (gcloud auth)
  console.log('Using application default credentials for BigQuery');
}

const bigquery = new BigQuery(bigqueryOptions);

class BigQueryService {
  constructor() {
    this.dataset = bigquery.dataset(DATASET_ID);
  }

  /**
   * Initialize BigQuery dataset and tables
   */
  async initialize() {
    try {
      console.log('🔄 Initializing BigQuery dataset and tables...');

      // Create dataset if it doesn't exist
      const [datasetExists] = await this.dataset.exists();
      if (!datasetExists) {
        console.log(`📦 Creating dataset: ${DATASET_ID}`);
        await bigquery.createDataset(DATASET_ID, {
          location: 'US',
          description: 'Career Insights Dashboard Analytics Data'
        });
        console.log(`✅ Dataset ${DATASET_ID} created successfully`);
      } else {
        console.log(`✅ Dataset ${DATASET_ID} already exists`);
      }

      // Create tables
      for (const [tableName, schema] of Object.entries(schemas)) {
        await this.createTable(tableName, schema);
      }

      console.log('✅ BigQuery initialization complete');
      return { success: true, message: 'BigQuery initialized successfully' };
    } catch (error) {
      console.error('❌ Error initializing BigQuery:', error);
      throw error;
    }
  }

  /**
   * Create a table with schema
   */
  async createTable(tableName, schema) {
    try {
      const table = this.dataset.table(tableName);
      const [tableExists] = await table.exists();

      if (!tableExists) {
        const options = {
          schema: schema,
          location: 'US'
        };

        // Add partitioning and clustering if configured
        const config = tableConfigurations[tableName];
        if (config) {
          if (config.timePartitioning) {
            options.timePartitioning = config.timePartitioning;
          }
          if (config.clustering) {
            options.clustering = config.clustering;
          }
        }

        await this.dataset.createTable(tableName, options);
        console.log(`✅ Table ${tableName} created successfully`);
      } else {
        console.log(`✅ Table ${tableName} already exists`);
      }
    } catch (error) {
      console.error(`❌ Error creating table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Insert rows into a table (batch)
   */
  async insertRows(tableName, rows) {
    try {
      if (!rows || rows.length === 0) {
        console.log(`⚠️ No rows to insert into ${tableName}`);
        return { success: true, inserted: 0 };
      }

      const table = this.dataset.table(tableName);
      await table.insert(rows);

      console.log(`✅ Inserted ${rows.length} rows into ${tableName}`);
      return { success: true, inserted: rows.length };
    } catch (error) {
      console.error(`❌ Error inserting rows into ${tableName}:`, error);

      // Handle partial failures
      if (error.name === 'PartialFailureError') {
        console.error('Partial failures:', error.errors);
      }

      throw error;
    }
  }

  /**
   * Sync user activities to BigQuery
   */
  async syncUserActivities(activities) {
    const rows = activities.map(activity => ({
      userId: activity.userId,
      userName: activity.userName || null,
      email: activity.email || null,
      careerDomain: activity.careerDomain || null,
      skillLevel: activity.skillLevel || null,
      location: activity.location || null,
      state: activity.state || null,
      activityType: activity.activityType,
      activityDetails: activity.activityDetails ? JSON.stringify(activity.activityDetails) : null,
      timestamp: activity.timestamp || new Date().toISOString(),
      eventDate: this.getDateString(activity.timestamp)
    }));

    return await this.insertRows('user_activities', rows);
  }

  /**
   * Sync ATS scores to BigQuery
   */
  async syncAtsScores(scores) {
    const rows = scores.map(score => ({
      userId: score.userId,
      resumeId: score.resumeId || null,
      score: parseFloat(score.score),
      previousScore: score.previousScore ? parseFloat(score.previousScore) : null,
      improvement: score.improvement ? parseFloat(score.improvement) : null,
      category: score.category || null,
      suggestions: score.suggestions ? JSON.stringify(score.suggestions) : null,
      timestamp: score.timestamp || new Date().toISOString(),
      eventDate: this.getDateString(score.timestamp)
    }));

    return await this.insertRows('ats_scores', rows);
  }

  /**
   * Sync skills trends to BigQuery
   */
  async syncSkillsTrends(skills) {
    const rows = skills.map(skill => ({
      skillName: skill.skillName,
      category: skill.category || null,
      userCount: parseInt(skill.userCount),
      avgProficiency: skill.avgProficiency || null,
      demandScore: skill.demandScore ? parseFloat(skill.demandScore) : null,
      trendDirection: skill.trendDirection || 'stable',
      monthYear: skill.monthYear || this.getCurrentMonthYear(),
      timestamp: new Date().toISOString()
    }));

    return await this.insertRows('skills_trends', rows);
  }

  /**
   * Sync ROI metrics to BigQuery
   */
  async syncRoiMetrics(metrics) {
    const rows = metrics.map(metric => ({
      careerDomain: metric.careerDomain,
      totalUsers: parseInt(metric.totalUsers),
      avgCompletionRate: metric.avgCompletionRate ? parseFloat(metric.avgCompletionRate) : null,
      avgAtsScore: metric.avgAtsScore ? parseFloat(metric.avgAtsScore) : null,
      avgMockInterviewScore: metric.avgMockInterviewScore ? parseFloat(metric.avgMockInterviewScore) : null,
      jobApplications: metric.jobApplications ? parseInt(metric.jobApplications) : null,
      successRate: metric.successRate ? parseFloat(metric.successRate) : null,
      avgTimeToComplete: metric.avgTimeToComplete ? parseFloat(metric.avgTimeToComplete) : null,
      monthYear: metric.monthYear || this.getCurrentMonthYear(),
      timestamp: new Date().toISOString()
    }));

    return await this.insertRows('roi_metrics', rows);
  }

  /**
   * Sync scholarship applications to BigQuery
   */
  async syncScholarshipApplications(applications) {
    const rows = applications.map(app => ({
      userId: app.userId,
      scholarshipId: app.scholarshipId || null,
      scholarshipName: app.scholarshipName || null,
      category: app.category || null,
      amount: app.amount ? parseFloat(app.amount) : null,
      state: app.state || null,
      country: app.country || 'USA',
      status: app.status || 'viewed',
      timestamp: app.timestamp || new Date().toISOString(),
      eventDate: this.getDateString(app.timestamp)
    }));

    return await this.insertRows('scholarship_applications', rows);
  }

  /**
   * Sync resource engagement to BigQuery
   */
  async syncResourceEngagement(resources) {
    const rows = resources.map(resource => ({
      userId: resource.userId,
      resourceId: resource.resourceId.toString(),
      resourceTitle: resource.resourceTitle || null,
      category: resource.category || null,
      completionStatus: Boolean(resource.completionStatus),
      timeSpent: resource.timeSpent ? parseInt(resource.timeSpent) : null,
      rating: resource.rating ? parseFloat(resource.rating) : null,
      timestamp: resource.timestamp || new Date().toISOString(),
      eventDate: this.getDateString(resource.timestamp)
    }));

    return await this.insertRows('resource_engagement', rows);
  }

  /**
   * Sync roadmap progress to BigQuery
   */
  async syncRoadmapProgress(roadmaps) {
    const rows = roadmaps.map(roadmap => ({
      userId: roadmap.userId,
      roadmapId: roadmap.roadmapId || roadmap._id?.toString(),
      careerDomain: roadmap.careerDomain,
      skillLevel: roadmap.skillLevel || null,
      totalMilestones: parseInt(roadmap.totalMilestones),
      completedMilestones: parseInt(roadmap.completedMilestones),
      progressPercentage: parseFloat(roadmap.progressPercentage),
      lastActivity: roadmap.lastActivity || new Date().toISOString(),
      timestamp: new Date().toISOString()
    }));

    return await this.insertRows('roadmap_progress', rows);
  }

  /**
   * Sync mock interview performance to BigQuery
   */
  async syncMockInterviewPerformance(performances) {
    const rows = performances.map(perf => ({
      userId: perf.userId,
      sessionId: perf.sessionId || null,
      testType: perf.testType || null,
      score: parseFloat(perf.score),
      totalQuestions: perf.totalQuestions ? parseInt(perf.totalQuestions) : null,
      correctAnswers: perf.correctAnswers ? parseInt(perf.correctAnswers) : null,
      timeSpent: perf.timeSpent ? parseInt(perf.timeSpent) : null,
      difficulty: perf.difficulty || null,
      timestamp: perf.timestamp || new Date().toISOString(),
      eventDate: this.getDateString(perf.timestamp)
    }));

    return await this.insertRows('mock_interview_performance', rows);
  }

  /**
   * Query aggregated insights
   */
  async getInsights(queryType, params = {}) {
    try {
      let query = '';

      switch (queryType) {
        case 'career_domains':
          query = `
            SELECT
              careerDomain,
              COUNT(DISTINCT userId) as studentCount,
              AVG(progressPercentage) as avgProgress
            FROM \`${PROJECT_ID}.${DATASET_ID}.roadmap_progress\`
            WHERE careerDomain IS NOT NULL
            GROUP BY careerDomain
            ORDER BY studentCount DESC
          `;
          break;

        case 'top_skills':
          query = `
            SELECT
              skillName,
              userCount,
              category,
              trendDirection
            FROM \`${PROJECT_ID}.${DATASET_ID}.skills_trends\`
            WHERE monthYear = @monthYear
            ORDER BY userCount DESC
            LIMIT 10
          `;
          break;

        case 'ats_improvement':
          query = `
            SELECT
              DATE(timestamp) as date,
              AVG(score) as avgScore,
              AVG(improvement) as avgImprovement,
              COUNT(*) as totalScores
            FROM \`${PROJECT_ID}.${DATASET_ID}.ats_scores\`
            WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
            GROUP BY date
            ORDER BY date ASC
          `;
          break;

        case 'students_by_state':
          query = `
            SELECT
              state,
              COUNT(DISTINCT userId) as studentCount
            FROM \`${PROJECT_ID}.${DATASET_ID}.user_activities\`
            WHERE state IS NOT NULL
            GROUP BY state
            ORDER BY studentCount DESC
          `;
          break;

        case 'roi_comparison':
          query = `
            SELECT
              careerDomain,
              totalUsers,
              avgCompletionRate,
              avgAtsScore,
              avgMockInterviewScore,
              successRate
            FROM \`${PROJECT_ID}.${DATASET_ID}.roi_metrics\`
            WHERE monthYear = @monthYear
            ORDER BY totalUsers DESC
          `;
          break;

        case 'scholarship_stats':
          query = `
            SELECT
              category,
              state,
              COUNT(*) as applicationCount,
              AVG(amount) as avgAmount
            FROM \`${PROJECT_ID}.${DATASET_ID}.scholarship_applications\`
            WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
            GROUP BY category, state
            ORDER BY applicationCount DESC
          `;
          break;

        default:
          throw new Error(`Unknown query type: ${queryType}`);
      }

      const options = {
        query,
        params: params.monthYear ? { monthYear: params.monthYear || this.getCurrentMonthYear() } : {},
        location: 'US'
      };

      const [rows] = await bigquery.query(options);
      return rows;
    } catch (error) {
      console.error(`❌ Error executing query ${queryType}:`, error);
      throw error;
    }
  }

  /**
   * Helper: Get date string from timestamp
   */
  getDateString(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Get current month-year string
   */
  getCurrentMonthYear() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Test connection and permissions
   */
  async testConnection() {
    try {
      console.log('🔄 Testing BigQuery connection...');

      const query = `SELECT 1 as test`;
      const [rows] = await bigquery.query({ query, location: 'US' });

      console.log('✅ BigQuery connection successful');
      return { success: true, message: 'Connection test passed' };
    } catch (error) {
      console.error('❌ BigQuery connection failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const bigQueryService = new BigQueryService();
module.exports = bigQueryService;
