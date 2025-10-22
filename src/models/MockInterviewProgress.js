const mongoose = require('mongoose');

const mockInterviewProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  interviewSessions: [{
    domain: {
      type: String,
      required: true
    },
    domainId: {
      type: String
    },
    role: {
      type: String,
      required: true
    },
    level: {
      type: String
    },
    sessionType: {
      type: String,
      enum: ['basic', 'intelligent'],
      default: 'basic'
    },
    analysisMode: {
      type: String,
      enum: ['standard', 'advanced'],
      default: 'standard'
    },
    questionsAnswered: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    averageScore: {
      type: Number,
      default: 0
    },
    answers: [{
      question: String,
      questionData: {
        questionText: String,
        difficulty: String,
        category: String,
        keywords: [String]
      },
      answer: String,
      transcription: {
        text: String,
        confidence: Number,
        wordCount: Number,
        duration: Number
      },
      analysis: {
        mode: String,
        score: Number,
        scoreBreakdown: {
          content: Number,
          delivery: Number,
          bodyLanguage: Number
        },
        feedback: {
          strengths: [String],
          improvements: [String],
          technicalAccuracy: Number,
          clarity: Number,
          relevance: Number
        },
        domainSpecificInsights: String,
        speechAnalysis: {
          wordsPerMinute: Number,
          fillerWordCount: Number,
          fillerWordPercentage: String,
          confidence: String,
          recommendations: [String]
        },
        bodyLanguageAnalysis: {
          eyeContact: String,
          bodyMovement: String,
          overallPresence: String,
          recommendations: [String]
        },
        overallAssessment: String
      },
      timestamp: Date
    }],
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  aptitudeTests: [{
    testId: {
      type: Number,
      required: true
    },
    testType: {
      type: String,
      required: true,
      enum: ['logical-reasoning', 'quantitative-aptitude', 'verbal-ability']
    },
    testTitle: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    timeTaken: {
      type: Number,
      required: true // in seconds
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    correctAnswers: {
      type: Number,
      required: true
    },
    incorrectAnswers: {
      type: Number,
      required: true
    },
    unanswered: {
      type: Number,
      required: true
    },
    topicPerformance: [{
      topic: String,
      correct: Number,
      total: Number,
      percentage: Number
    }],
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
mockInterviewProgressSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Additional indexes for performance optimization
mockInterviewProgressSchema.index({ userId: 1, updatedAt: -1 });
mockInterviewProgressSchema.index({ 'aptitudeTests.completedAt': -1 });
mockInterviewProgressSchema.index({ 'interviewSessions.completedAt': -1 });

// Static method to find or create by user ID
mockInterviewProgressSchema.statics.findOrCreateByUserId = async function(userId) {
  let progress = await this.findOne({ userId });

  if (!progress) {
    progress = await this.create({
      userId,
      interviewSessions: [],
      aptitudeTests: []
    });
  }

  return progress;
};

// Method to get statistics
mockInterviewProgressSchema.methods.getStats = function() {
  const totalInterviews = this.interviewSessions.length;
  const totalAptitudeTests = this.aptitudeTests.length;

  // Calculate average aptitude score
  const avgAptitudeScore = totalAptitudeTests > 0
    ? Math.round(this.aptitudeTests.reduce((sum, test) => sum + test.percentage, 0) / totalAptitudeTests)
    : 0;

  // Calculate average time per test (in minutes)
  const avgTimePerTest = totalAptitudeTests > 0
    ? Math.round(this.aptitudeTests.reduce((sum, test) => sum + test.timeTaken, 0) / totalAptitudeTests / 60)
    : 0;

  // Group by test type
  const testsByType = {
    'logical-reasoning': [],
    'quantitative-aptitude': [],
    'verbal-ability': []
  };

  this.aptitudeTests.forEach(test => {
    if (testsByType[test.testType]) {
      testsByType[test.testType].push(test);
    }
  });

  // Calculate performance by type
  const performanceByType = {};
  Object.keys(testsByType).forEach(type => {
    const tests = testsByType[type];
    if (tests.length > 0) {
      performanceByType[type] = {
        testsTaken: tests.length,
        avgScore: Math.round(tests.reduce((sum, t) => sum + t.percentage, 0) / tests.length),
        bestScore: Math.max(...tests.map(t => t.percentage)),
        lastScore: tests[tests.length - 1].percentage,
        improvement: tests.length > 1
          ? tests[tests.length - 1].percentage - tests[0].percentage
          : 0
      };
    }
  });

  // Identify strong and weak categories
  const categoryScores = {};
  this.aptitudeTests.forEach(test => {
    test.topicPerformance.forEach(topic => {
      if (!categoryScores[topic.topic]) {
        categoryScores[topic.topic] = { correct: 0, total: 0 };
      }
      categoryScores[topic.topic].correct += topic.correct;
      categoryScores[topic.topic].total += topic.total;
    });
  });

  const categories = Object.keys(categoryScores).map(topic => ({
    topic,
    percentage: Math.round((categoryScores[topic].correct / categoryScores[topic].total) * 100)
  })).sort((a, b) => b.percentage - a.percentage);

  const strongCategories = categories.slice(0, 3).map(c => c.topic);
  const weakCategories = categories.slice(-3).reverse().map(c => c.topic);

  // Recent activity
  const recentTests = this.aptitudeTests
    .slice(-5)
    .reverse()
    .map(test => ({
      testTitle: test.testTitle,
      percentage: test.percentage,
      completedAt: test.completedAt
    }));

  const recentInterviews = this.interviewSessions
    .slice(-5)
    .reverse()
    .map(session => ({
      domain: session.domain,
      role: session.role,
      questionsAnswered: session.questionsAnswered,
      completedAt: session.completedAt
    }));

  return {
    totalInterviews,
    totalAptitudeTests,
    avgAptitudeScore,
    avgTimePerTest,
    performanceByType,
    strongCategories,
    weakCategories,
    recentTests,
    recentInterviews,
    lastActivity: this.updatedAt
  };
};

module.exports = mongoose.model('MockInterviewProgress', mockInterviewProgressSchema);
