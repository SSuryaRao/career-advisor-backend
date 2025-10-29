const mentorService = require('../services/mentorService');
const User = require('../models/User');

/**
 * Send a message to the AI mentor and get a response
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, mentorPersona, language = 'English' } = req.body;
    const { uid } = req.user;

    // Get user from database
    const user = await User.findByFirebaseUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userId = user._id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (!mentorPersona || !mentorPersona.id || !mentorPersona.name) {
      return res.status(400).json({
        success: false,
        error: 'Mentor persona is required'
      });
    }

    // Validate message length
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long. Maximum 2000 characters.'
      });
    }

    console.log(`📨 AI Mentor message from user ${userId}:`, message.substring(0, 50));

    // Generate mentor response
    const result = await mentorService.generateMentorResponse(
      userId,
      message,
      mentorPersona,
      language
    );

    // Increment usage BEFORE sending response
    const { incrementUsageForRequest } = require('../middleware/usageLimits');
    await incrementUsageForRequest(req);

    res.json({
      success: true,
      data: {
        response: result.response,
        suggestions: result.suggestions,
        conversationId: result.conversationId,
        messageCount: result.messageCount
      }
    });

  } catch (error) {
    console.error('❌ Error in sendMessage:', error);

    // Handle specific errors
    if (error.message.includes('not configured')) {
      return res.status(503).json({
        success: false,
        error: 'AI mentor service is temporarily unavailable. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate mentor response. Please try again.'
    });
  }
};

/**
 * Get conversation history with a specific mentor
 */
exports.getConversationHistory = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { uid } = req.user;

    const user = await User.findByFirebaseUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userId = user._id;

    const history = await mentorService.getConversationHistory(userId, mentorId);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('❌ Error in getConversationHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation history'
    });
  }
};

/**
 * Get all active conversations for the user
 */
exports.getUserConversations = async (req, res) => {
  try {
    const { uid } = req.user;

    const user = await User.findByFirebaseUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userId = user._id;

    const conversations = await mentorService.getUserConversations(userId);

    res.json({
      success: true,
      data: {
        conversations,
        count: conversations.length
      }
    });

  } catch (error) {
    console.error('❌ Error in getUserConversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
};

/**
 * Get personalized progress analysis and recommendations
 */
exports.getProgressAnalysis = async (req, res) => {
  try {
    const { uid } = req.user;

    const user = await User.findByFirebaseUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userId = user._id;

    const analysis = await mentorService.generateProgressAnalysis(userId);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ Error in getProgressAnalysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate progress analysis'
    });
  }
};

/**
 * Generate personalized learning path based on user's goals and skills
 */
exports.generateLearningPath = async (req, res) => {
  try {
    const { uid } = req.user;
    const { targetRole, timeframe = '3 months' } = req.body;

    const user = await User.findByFirebaseUid(uid).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const vertexAI = require('../services/vertexAI');

    const prompt = `Create a personalized learning path for this user:

User Profile:
- Name: ${user.name}
- Current Skills: ${user.skills?.map(s => `${s.name} (${s.level})`).join(', ') || 'None'}
- Career Goal: ${user.profile?.careerGoal || targetRole || 'Not specified'}
- Interests: ${user.profile?.interests?.join(', ') || 'Not specified'}

Target: ${targetRole || user.profile?.careerGoal || 'Career advancement'}
Timeframe: ${timeframe}

Create a structured learning path with:
1. Skill gaps to address (compared to target role)
2. Recommended learning resources (courses, books, projects)
3. Week-by-week milestones for the timeframe
4. Practice projects to build portfolio
5. Certifications that would be valuable

Format as JSON with this structure:
{
  "skillGaps": [{ "skill": "name", "priority": "high|medium|low", "currentLevel": "beginner|intermediate|advanced", "targetLevel": "intermediate|advanced|expert" }],
  "learningResources": [{ "title": "resource name", "type": "course|book|tutorial|project", "url": "url if available", "duration": "estimated time", "priority": "high|medium|low" }],
  "weeklyMilestones": [{ "week": 1, "goals": ["goal 1", "goal 2"], "focus": "main focus area" }],
  "projects": [{ "title": "project name", "description": "brief description", "skills": ["skill 1", "skill 2"], "difficulty": "easy|medium|hard" }],
  "certifications": [{ "name": "certification name", "provider": "provider", "value": "why it's valuable", "estimatedCost": "cost estimate" }]
}`;

    const response = await vertexAI.generateContent(prompt);

    // Try to parse JSON from the response
    let learningPath;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || response.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        learningPath = JSON.parse(jsonMatch[1]);
      } else {
        learningPath = { rawResponse: response };
      }
    } catch (parseError) {
      learningPath = { rawResponse: response };
    }

    // Log activity
    await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $push: {
          activityLog: {
            action: 'learning_path_generated',
            details: { targetRole, timeframe },
            timestamp: new Date()
          }
        }
      }
    );

    // Increment usage BEFORE sending response
    const { incrementUsageForRequest } = require('../middleware/usageLimits');
    await incrementUsageForRequest(req);

    res.json({
      success: true,
      data: {
        learningPath,
        targetRole: targetRole || user.profile?.careerGoal,
        timeframe,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error in generateLearningPath:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate learning path'
    });
  }
};

/**
 * Get career guidance based on user's current situation
 */
exports.getCareerGuidance = async (req, res) => {
  try {
    const { uid } = req.user;
    const { situation } = req.body;

    const user = await User.findByFirebaseUid(uid).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const vertexAI = require('../services/vertexAI');

    const prompt = `Provide career guidance for this user's situation:

User Profile:
- Name: ${user.name}
- Skills: ${user.skills?.map(s => `${s.name} (${s.level})`).join(', ') || 'None'}
- Career Goal: ${user.profile?.careerGoal || 'Not specified'}
- Current Title: ${user.profile?.title || 'Not specified'}
- Interests: ${user.profile?.interests?.join(', ') || 'Not specified'}

Situation: ${situation || 'General career advice needed'}

Provide:
1. Assessment of their current situation
2. Immediate actionable steps (next 2 weeks)
3. Short-term goals (1-3 months)
4. Long-term strategy (6-12 months)
5. Potential challenges and how to overcome them
6. Resources and connections that might help

Be specific, encouraging, and actionable. Consider the Indian job market context.`;

    const guidance = await vertexAI.generateContent(prompt);

    // Log activity
    await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $push: {
          activityLog: {
            action: 'career_guidance_requested',
            details: { situation },
            timestamp: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      data: {
        guidance,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error in getCareerGuidance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate career guidance'
    });
  }
};
