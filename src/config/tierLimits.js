// Usage limits by tier (-1 = unlimited)
const TIER_LIMITS = {
  free: {
    resumeAnalysis: 5,
    resumeImprovement: 3,
    resumeBuilder: 3,
    mockInterview: 10,
    intelligentInterviewStandard: 0, // Not available
    intelligentInterviewVideo: 0, // Not available
    aiMentorMessages: 30,
    learningPaths: 0, // Not available
    jobRecommendations: 5,
    careerRecommendations: 1,
    roadmapGeneration: 1,
    scholarshipPersonalization: 3,
    internshipPersonalization: 3,
    chatbotMessages: 20
  },

  student: {
    resumeAnalysis: 15,
    resumeImprovement: 10,
    resumeBuilder: 10,
    mockInterview: 25,
    intelligentInterviewStandard: 5,
    intelligentInterviewVideo: 1, // 1 video interview (3 min) per month
    aiMentorMessages: 100,
    learningPaths: 3,
    jobRecommendations: 20,
    careerRecommendations: 5,
    roadmapGeneration: 5,
    scholarshipPersonalization: 10,
    internshipPersonalization: 10,
    chatbotMessages: 50
  },

  premium: {
    resumeAnalysis: -1, // Unlimited
    resumeImprovement: -1,
    resumeBuilder: -1,
    mockInterview: -1,
    intelligentInterviewStandard: 20,
    intelligentInterviewVideo: 1, // 1 video interview to try the feature
    aiMentorMessages: -1,
    learningPaths: 10,
    jobRecommendations: 50,
    careerRecommendations: 10,
    roadmapGeneration: 10,
    scholarshipPersonalization: -1,
    internshipPersonalization: -1,
    chatbotMessages: 100
  },

  pro: {
    resumeAnalysis: -1,
    resumeImprovement: -1,
    resumeBuilder: -1,
    mockInterview: -1,
    intelligentInterviewStandard: -1,
    intelligentInterviewVideo: 10, // Pro gets 10 video interviews
    aiMentorMessages: -1,
    learningPaths: -1,
    jobRecommendations: -1,
    careerRecommendations: -1,
    roadmapGeneration: -1,
    scholarshipPersonalization: -1,
    internshipPersonalization: -1,
    chatbotMessages: -1
  }
};

// Daily limits (even for unlimited plans - anti-abuse)
const DAILY_LIMITS = {
  resumeAnalysis: 10,
  intelligentInterviewVideo: 2, // Max 2 video interviews per day
  intelligentInterviewStandard: 5,
  roadmapGeneration: 3
};

// Hourly rate limits (anti-abuse)
const HOURLY_LIMITS = {
  resumeAnalysis: 3,
  aiMentorMessages: 20,
  intelligentInterviewVideo: 1 // Max 1 video interview per hour
};

// Video interview duration limits by tier (in seconds)
const VIDEO_DURATION_LIMITS = {
  free: 0,        // No video interviews
  student: 180,   // 3 minutes (cost-optimized)
  premium: 300,   // 5 minutes
  pro: 600        // 10 minutes
};

module.exports = {
  TIER_LIMITS,
  DAILY_LIMITS,
  HOURLY_LIMITS,
  VIDEO_DURATION_LIMITS
};
