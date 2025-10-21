const MockInterviewProgress = require('../models/MockInterviewProgress');
const User = require('../models/User');
const intelligentInterview = require('../services/intelligentInterview');
const interviewAnalysis = require('../services/interviewAnalysis');
const { getAllDomains, getDomainById, getDomainsByCategory, interviewDomains } = require('../config/interviewDomains');

/**
 * Get all available interview domains
 */
const getDomains = async (req, res) => {
  try {
    const { category } = req.query;

    let domains;
    if (category) {
      domains = getDomainsByCategory(category);
    } else {
      domains = getAllDomains();
    }

    res.status(200).json({
      success: true,
      data: {
        domains,
        categories: Object.keys(interviewDomains).map(key => ({
          key,
          label: interviewDomains[key].label
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch domains',
      error: error.message
    });
  }
};

/**
 * Get domain details by ID
 */
const getDomainDetails = async (req, res) => {
  try {
    const { domainId } = req.params;

    const domain = getDomainById(domainId);

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    res.status(200).json({
      success: true,
      data: domain
    });

  } catch (error) {
    console.error('Error fetching domain details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch domain details',
      error: error.message
    });
  }
};

/**
 * Generate interview questions for a session
 */
const generateQuestions = async (req, res) => {
  try {
    const { domainId, level, count } = req.body;

    if (!domainId || !level) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: domainId, level'
      });
    }

    const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 10);

    const questions = await intelligentInterview.generateQuestions({
      domainId,
      level,
      count: questionCount
    });

    res.status(200).json({
      success: true,
      data: {
        questions,
        count: questions.length
      }
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate questions',
      error: error.message
    });
  }
};

/**
 * Analyze interview response - Standard mode
 */
const analyzeResponseStandard = async (req, res) => {
  try {
    const {
      questionText,
      responseText,
      domainId,
      level,
      expectedKeywords
    } = req.body;

    if (!questionText || !responseText || !domainId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: questionText, responseText, domainId'
      });
    }

    const analysis = await interviewAnalysis.analyzeStandard({
      questionText,
      responseText,
      domainId,
      level,
      expectedKeywords
    });

    res.status(200).json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error analyzing response (standard):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze response',
      error: error.message
    });
  }
};

/**
 * Analyze interview response - Advanced mode
 * Accepts audio/video files for comprehensive analysis
 */
const analyzeResponseAdvanced = async (req, res) => {
  try {
    const {
      questionText,
      domainId,
      level,
      userId,
      sessionId,
      expectedKeywords
    } = req.body;

    if (!questionText || !domainId || !userId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: questionText, domainId, userId, sessionId'
      });
    }

    // Get audio and video buffers from files
    const audioBuffer = req.files?.audio?.[0]?.buffer;
    const videoBuffer = req.files?.video?.[0]?.buffer;

    if (!audioBuffer) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required for advanced analysis'
      });
    }

    const analysis = await interviewAnalysis.analyzeAdvanced({
      questionText,
      audioBuffer,
      videoBuffer,
      domainId,
      level,
      userId,
      sessionId,
      expectedKeywords
    });

    res.status(200).json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error analyzing response (advanced):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze response',
      error: error.message
    });
  }
};

/**
 * Start a new intelligent interview session
 */
const startSession = async (req, res) => {
  try {
    const {
      userId,
      domainId,
      level,
      questionCount,
      analysisMode
    } = req.body;

    if (!userId || !domainId || !level) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, domainId, level'
      });
    }

    const domain = getDomainById(domainId);

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    // Generate questions for the session
    const count = Math.min(Math.max(parseInt(questionCount) || 5, 1), 10);
    const questions = await intelligentInterview.generateQuestions({
      domainId,
      level,
      count
    });

    const sessionData = {
      sessionId: `session_${Date.now()}_${userId}`,
      domainId,
      domain: domain.name,
      level,
      analysisMode: analysisMode || 'standard',
      totalQuestions: questions.length,
      questions,
      createdAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: sessionData
    });

  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start session',
      error: error.message
    });
  }
};

/**
 * Save completed intelligent interview session
 */
const saveSession = async (req, res) => {
  try {
    const {
      userId,
      sessionData,
      answers
    } = req.body;

    if (!userId || !sessionData || !answers) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, sessionData, answers'
      });
    }

    // Find or create user
    let mongoUserId = userId;
    let user = null;

    try {
      user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      }
    } catch (error) {
      console.log(`User lookup warning:`, error.message);
    }

    // Get progress document
    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);

    // Calculate average score
    const scores = answers
      .filter(a => a.analysis && a.analysis.score)
      .map(a => a.analysis.score);

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    // Add session to progress
    progress.interviewSessions.push({
      domain: sessionData.domain,
      domainId: sessionData.domainId,
      role: sessionData.domain, // Using domain name as role for now
      level: sessionData.level,
      sessionType: 'intelligent',
      analysisMode: sessionData.analysisMode || 'standard',
      questionsAnswered: answers.length,
      totalQuestions: sessionData.totalQuestions,
      averageScore,
      answers: answers.map(a => ({
        question: a.questionData?.questionText || a.question,
        questionData: a.questionData,
        answer: a.answer || a.transcription?.text,
        transcription: a.transcription,
        analysis: a.analysis,
        timestamp: new Date(a.timestamp || Date.now())
      })),
      completedAt: new Date()
    });

    await progress.save();

    // Log activity in user model if available
    if (user && user.logActivity) {
      await user.logActivity('intelligent_interview_completed', {
        domain: sessionData.domain,
        level: sessionData.level,
        questionsAnswered: answers.length,
        averageScore,
        analysisMode: sessionData.analysisMode
      });
    }

    res.status(200).json({
      success: true,
      message: 'Interview session saved successfully',
      data: {
        sessionId: progress.interviewSessions[progress.interviewSessions.length - 1]._id,
        averageScore,
        stats: progress.getStats()
      }
    });

  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save session',
      error: error.message
    });
  }
};

/**
 * Get user's intelligent interview history
 */
const getSessionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Find user
    let mongoUserId = userId;
    try {
      const user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      }
    } catch (error) {
      console.log(`User lookup warning:`, error.message);
    }

    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);

    // Filter intelligent interview sessions only
    const intelligentSessions = progress.interviewSessions
      .filter(session => session.sessionType === 'intelligent')
      .slice(-limit)
      .reverse()
      .map(session => ({
        id: session._id,
        domain: session.domain,
        domainId: session.domainId,
        level: session.level,
        analysisMode: session.analysisMode,
        questionsAnswered: session.questionsAnswered,
        totalQuestions: session.totalQuestions,
        averageScore: session.averageScore,
        completedAt: session.completedAt
      }));

    res.status(200).json({
      success: true,
      data: {
        sessions: intelligentSessions,
        total: progress.interviewSessions.filter(s => s.sessionType === 'intelligent').length
      }
    });

  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session history',
      error: error.message
    });
  }
};

/**
 * Get detailed session results
 */
const getSessionDetails = async (req, res) => {
  try {
    const { userId, sessionId } = req.params;

    // Find user
    let mongoUserId = userId;
    try {
      const user = await User.findByFirebaseUid(userId);
      if (user) {
        mongoUserId = user._id.toString();
      }
    } catch (error) {
      console.log(`User lookup warning:`, error.message);
    }

    const progress = await MockInterviewProgress.findOrCreateByUserId(mongoUserId);

    const session = progress.interviewSessions.find(s => s._id.toString() === sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.status(200).json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session details',
      error: error.message
    });
  }
};

module.exports = {
  getDomains,
  getDomainDetails,
  generateQuestions,
  analyzeResponseStandard,
  analyzeResponseAdvanced,
  startSession,
  saveSession,
  getSessionHistory,
  getSessionDetails
};
