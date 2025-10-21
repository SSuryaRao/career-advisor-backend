const MockInterviewProgress = require('../models/MockInterviewProgress');
const User = require('../models/User');

// Save mock interview session
const saveInterviewSession = async (req, res) => {
  try {
    const { userId, domain, role, questionsAnswered, totalQuestions, answers } = req.body;

    if (!userId || !domain || !role || !questionsAnswered || !totalQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, domain, role, questionsAnswered, totalQuestions'
      });
    }

    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    let user = null;
    try {
      user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      } else {
        console.log(`User with Firebase UID ${userId} not found in MongoDB, using UID for progress`);
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
    }

    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);

    // Add interview session
    progress.interviewSessions.push({
      domain,
      role,
      questionsAnswered,
      totalQuestions,
      answers: answers || [],
      completedAt: new Date()
    });

    await progress.save();

    // Log activity in user model if user exists
    if (user && user.logActivity) {
      await user.logActivity('mock_interview_completed', {
        domain,
        role,
        questionsAnswered,
        totalQuestions
      });
    }

    res.status(200).json({
      success: true,
      message: 'Interview session saved successfully',
      data: {
        sessionId: progress.interviewSessions[progress.interviewSessions.length - 1]._id,
        stats: progress.getStats()
      }
    });
  } catch (error) {
    console.error('Error saving interview session:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Save aptitude test result
const saveAptitudeTestResult = async (req, res) => {
  try {
    const {
      userId,
      testId,
      testType,
      testTitle,
      score,
      percentage,
      timeTaken,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      topicPerformance
    } = req.body;

    if (!userId || !testId || !testType || !testTitle || score === undefined ||
        percentage === undefined || timeTaken === undefined || !totalQuestions ||
        correctAnswers === undefined || incorrectAnswers === undefined ||
        unanswered === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        received: { userId, testId, testType, testTitle, score, percentage, timeTaken, totalQuestions, correctAnswers, incorrectAnswers, unanswered }
      });
    }

    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    let user = null;
    try {
      user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      } else {
        console.log(`User with Firebase UID ${userId} not found in MongoDB, using UID for progress`);
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
    }

    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);

    // Add aptitude test result
    progress.aptitudeTests.push({
      testId,
      testType,
      testTitle,
      score,
      percentage,
      timeTaken,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      topicPerformance: topicPerformance || [],
      completedAt: new Date()
    });

    await progress.save();

    // Log activity in user model if user exists
    if (user && user.logActivity) {
      await user.logActivity('aptitude_test_completed', {
        testId,
        testType,
        testTitle,
        percentage,
        correctAnswers,
        totalQuestions
      });
    }

    res.status(200).json({
      success: true,
      message: 'Aptitude test result saved successfully',
      data: {
        testResultId: progress.aptitudeTests[progress.aptitudeTests.length - 1]._id,
        stats: progress.getStats()
      }
    });
  } catch (error) {
    console.error('Error saving aptitude test result:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user mock interview and aptitude test statistics
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    try {
      const user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      } else {
        console.log(`User with Firebase UID ${userId} not found in MongoDB, using UID for progress`);
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
    }

    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);
    const stats = progress.getStats();

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalInterviews: progress.interviewSessions.length,
        totalAptitudeTests: progress.aptitudeTests.length
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's interview history
const getInterviewHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    try {
      const user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
    }

    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);

    const history = progress.interviewSessions
      .slice(-limit)
      .reverse()
      .map(session => ({
        id: session._id,
        domain: session.domain,
        role: session.role,
        questionsAnswered: session.questionsAnswered,
        totalQuestions: session.totalQuestions,
        completionRate: Math.round((session.questionsAnswered / session.totalQuestions) * 100),
        completedAt: session.completedAt
      }));

    res.status(200).json({
      success: true,
      data: {
        history,
        total: progress.interviewSessions.length
      }
    });
  } catch (error) {
    console.error('Error fetching interview history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's aptitude test history
const getAptitudeTestHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Try to find user by Firebase UID first
    let mongoUserId = userId;
    try {
      const user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      }
    } catch (error) {
      console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
    }

    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);

    const history = progress.aptitudeTests
      .slice(-limit)
      .reverse()
      .map(test => ({
        id: test._id,
        testId: test.testId,
        testType: test.testType,
        testTitle: test.testTitle,
        percentage: test.percentage,
        correctAnswers: test.correctAnswers,
        totalQuestions: test.totalQuestions,
        timeTaken: test.timeTaken,
        completedAt: test.completedAt
      }));

    res.status(200).json({
      success: true,
      data: {
        history,
        total: progress.aptitudeTests.length
      }
    });
  } catch (error) {
    console.error('Error fetching aptitude test history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  saveInterviewSession,
  saveAptitudeTestResult,
  getUserStats,
  getInterviewHistory,
  getAptitudeTestHistory
};
