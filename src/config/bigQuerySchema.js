/**
 * BigQuery Dataset and Tables Schema
 *
 * This defines the structure for Career Insights Dashboard data
 */

const DATASET_ID = 'career_insights';
const PROJECT_ID = 'careercraftai-475216';

// Table Schemas
const schemas = {
  // User Activities - tracks career domains, progress, and engagement
  user_activities: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'userName', type: 'STRING', mode: 'NULLABLE' },
    { name: 'email', type: 'STRING', mode: 'NULLABLE' },
    { name: 'careerDomain', type: 'STRING', mode: 'NULLABLE' },
    { name: 'skillLevel', type: 'STRING', mode: 'NULLABLE' },
    { name: 'location', type: 'STRING', mode: 'NULLABLE' },
    { name: 'state', type: 'STRING', mode: 'NULLABLE' },
    { name: 'activityType', type: 'STRING', mode: 'REQUIRED' },
    { name: 'activityDetails', type: 'JSON', mode: 'NULLABLE' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'eventDate', type: 'DATE', mode: 'REQUIRED' }
  ],

  // ATS Scores - Resume analysis scores and improvements
  ats_scores: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'resumeId', type: 'STRING', mode: 'NULLABLE' },
    { name: 'score', type: 'FLOAT', mode: 'REQUIRED' },
    { name: 'previousScore', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'improvement', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'category', type: 'STRING', mode: 'NULLABLE' },
    { name: 'suggestions', type: 'JSON', mode: 'NULLABLE' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'eventDate', type: 'DATE', mode: 'REQUIRED' }
  ],

  // Skills Trends - tracks skills demand and popularity
  skills_trends: [
    { name: 'skillName', type: 'STRING', mode: 'REQUIRED' },
    { name: 'category', type: 'STRING', mode: 'NULLABLE' },
    { name: 'userCount', type: 'INTEGER', mode: 'REQUIRED' },
    { name: 'avgProficiency', type: 'STRING', mode: 'NULLABLE' },
    { name: 'demandScore', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'trendDirection', type: 'STRING', mode: 'NULLABLE' }, // 'rising', 'stable', 'declining'
    { name: 'monthYear', type: 'STRING', mode: 'REQUIRED' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ],

  // ROI Metrics - career domain vs outcomes
  roi_metrics: [
    { name: 'careerDomain', type: 'STRING', mode: 'REQUIRED' },
    { name: 'totalUsers', type: 'INTEGER', mode: 'REQUIRED' },
    { name: 'avgCompletionRate', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'avgAtsScore', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'avgMockInterviewScore', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'jobApplications', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'successRate', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'avgTimeToComplete', type: 'FLOAT', mode: 'NULLABLE' }, // in days
    { name: 'monthYear', type: 'STRING', mode: 'REQUIRED' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ],

  // Scholarship Applications - tracks scholarship engagement
  scholarship_applications: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'scholarshipId', type: 'STRING', mode: 'NULLABLE' },
    { name: 'scholarshipName', type: 'STRING', mode: 'NULLABLE' },
    { name: 'category', type: 'STRING', mode: 'NULLABLE' },
    { name: 'amount', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'state', type: 'STRING', mode: 'NULLABLE' },
    { name: 'country', type: 'STRING', mode: 'NULLABLE' },
    { name: 'status', type: 'STRING', mode: 'NULLABLE' }, // 'applied', 'viewed', 'saved'
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'eventDate', type: 'DATE', mode: 'REQUIRED' }
  ],

  // Resource Engagement - tracks learning resource usage
  resource_engagement: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'resourceId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'resourceTitle', type: 'STRING', mode: 'NULLABLE' },
    { name: 'category', type: 'STRING', mode: 'NULLABLE' },
    { name: 'completionStatus', type: 'BOOLEAN', mode: 'REQUIRED' },
    { name: 'timeSpent', type: 'INTEGER', mode: 'NULLABLE' }, // in minutes
    { name: 'rating', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'eventDate', type: 'DATE', mode: 'REQUIRED' }
  ],

  // Roadmap Progress - milestone completion tracking
  roadmap_progress: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'roadmapId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'careerDomain', type: 'STRING', mode: 'REQUIRED' },
    { name: 'skillLevel', type: 'STRING', mode: 'NULLABLE' },
    { name: 'totalMilestones', type: 'INTEGER', mode: 'REQUIRED' },
    { name: 'completedMilestones', type: 'INTEGER', mode: 'REQUIRED' },
    { name: 'progressPercentage', type: 'FLOAT', mode: 'REQUIRED' },
    { name: 'lastActivity', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ],

  // Mock Interview Performance
  mock_interview_performance: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'sessionId', type: 'STRING', mode: 'NULLABLE' },
    { name: 'testType', type: 'STRING', mode: 'NULLABLE' }, // 'logical-reasoning', 'quantitative', 'verbal'
    { name: 'score', type: 'FLOAT', mode: 'REQUIRED' },
    { name: 'totalQuestions', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'correctAnswers', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'timeSpent', type: 'INTEGER', mode: 'NULLABLE' }, // in seconds
    { name: 'difficulty', type: 'STRING', mode: 'NULLABLE' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'eventDate', type: 'DATE', mode: 'REQUIRED' }
  ]
};

// Partitioning and Clustering configurations for optimization
const tableConfigurations = {
  user_activities: {
    timePartitioning: {
      type: 'DAY',
      field: 'eventDate'
    },
    clustering: {
      fields: ['careerDomain', 'activityType', 'state']
    }
  },
  ats_scores: {
    timePartitioning: {
      type: 'DAY',
      field: 'eventDate'
    },
    clustering: {
      fields: ['userId', 'category']
    }
  },
  skills_trends: {
    timePartitioning: {
      type: 'MONTH',
      field: 'timestamp'
    },
    clustering: {
      fields: ['skillName', 'category']
    }
  },
  roi_metrics: {
    clustering: {
      fields: ['careerDomain', 'monthYear']
    }
  },
  scholarship_applications: {
    timePartitioning: {
      type: 'DAY',
      field: 'eventDate'
    },
    clustering: {
      fields: ['category', 'state', 'status']
    }
  },
  resource_engagement: {
    timePartitioning: {
      type: 'DAY',
      field: 'eventDate'
    },
    clustering: {
      fields: ['category', 'userId']
    }
  },
  roadmap_progress: {
    clustering: {
      fields: ['careerDomain', 'userId']
    }
  },
  mock_interview_performance: {
    timePartitioning: {
      type: 'DAY',
      field: 'eventDate'
    },
    clustering: {
      fields: ['testType', 'userId']
    }
  }
};

module.exports = {
  DATASET_ID,
  PROJECT_ID,
  schemas,
  tableConfigurations
};
