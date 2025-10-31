const { SessionsClient } = require('@google-cloud/dialogflow-cx');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

class ChatbotController {
  constructor() {
    // Check if Dialogflow configuration is available
    const hasRequiredConfig = !!(
      process.env.DIALOGFLOW_PROJECT_ID &&
      process.env.DIALOGFLOW_AGENT_ID
    );

    this.isConfigured = false;

    if (hasRequiredConfig) {
      try {
        this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
        const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        // Initialize with appropriate credentials
        if (credentials) {
          // Local development with explicit service account key
          this.sessionsClient = new SessionsClient({
            keyFilename: credentials,
            apiEndpoint: `${this.location}-dialogflow.googleapis.com`
          });
        } else {
          // Production: Use Application Default Credentials
          this.sessionsClient = new SessionsClient({
            apiEndpoint: `${this.location}-dialogflow.googleapis.com`
          });
        }

        this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
        this.agentId = process.env.DIALOGFLOW_AGENT_ID;
        this.isConfigured = true;
        console.log('✅ Dialogflow CX initialized successfully');
        console.log(`📍 Using regional endpoint: ${this.location}-dialogflow.googleapis.com`);
      } catch (error) {
        console.error('❌ Failed to initialize Dialogflow CX:', error.message);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ Dialogflow CX not configured - using fallback mode');
    }
  }

  async sendMessage(req, res) {
    try {
      const { message, sessionId, language = 'en' } = req.body;
      const userId = req.user?.uid; // From auth middleware

      if (!message || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Message and sessionId are required'
        });
      }

      // If Dialogflow is not configured, use fallback
      if (!this.isConfigured) {
        return this.sendFallbackResponse(res, 'Dialogflow CX not configured');
      }

      // Get user context for enhanced responses
      let userContext = {};
      let user = null;

      if (userId) {
        user = await User.findOne({ firebaseUid: userId });
        if (user) {
          userContext = {
            name: user.name || 'there',
            careerGoal: user.careerGoal || '',
            skills: user.skills?.map(s => s.name).join(', ') || '',
            education: user.education || '',
            resumeScore: user.resumeAnalysis?.atsScore || 0,
            completedInterviews: user.mockInterviews?.length || 0
          };
        }
      }

      // Create session path
      const sessionPath = this.sessionsClient.projectLocationAgentSessionPath(
        this.projectId,
        this.location,
        this.agentId,
        sessionId || userId || `session-${Date.now()}`
      );

      console.log('🤖 Dialogflow CX session path:', sessionPath);
      console.log('💬 User message:', message);
      console.log('🌐 Language:', language);

      // Build request with user context parameters
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message,
          },
          languageCode: this.getLanguageCode(language),
        },
        queryParams: {
          parameters: {
            fields: {
              userName: { stringValue: userContext.name },
              userSkills: { stringValue: userContext.skills },
              careerGoal: { stringValue: userContext.careerGoal },
              resumeScore: { numberValue: userContext.resumeScore },
              completedInterviews: { numberValue: userContext.completedInterviews }
            }
          }
        }
      };

      // Send request to Dialogflow CX
      const [response] = await this.sessionsClient.detectIntent(request);
      const queryResult = response.queryResult;

      console.log('🎯 Intent detected:', queryResult.intent?.displayName);
      console.log('📊 Confidence:', queryResult.intentDetectionConfidence);

      // Extract response messages
      const botResponse = queryResult.responseMessages
        .filter(msg => msg.text)
        .map(msg => msg.text.text[0])
        .join(' ') || 'I apologize, but I didn\'t quite understand that. Could you please rephrase your question?';

      // Extract parameters
      const parameters = this.extractParameters(queryResult.parameters);

      // Get intent name
      const intentName = queryResult.intent?.displayName || 'unknown';

      // Handle intent routing and special actions
      const actionData = await this.handleIntentActions(intentName, parameters, userId, user);

      // Save conversation if user is authenticated
      if (userId) {
        await this.saveConversation(userId, message, botResponse, intentName, queryResult.intentDetectionConfidence);
      }

      // Track analytics
      await this.trackAnalytics(userId, intentName, queryResult.intentDetectionConfidence);

      res.status(200).json({
        success: true,
        data: {
          response: botResponse,
          intent: intentName,
          confidence: queryResult.intentDetectionConfidence,
          parameters: parameters,
          ...actionData
        }
      });

    } catch (error) {
      console.error('❌ Chatbot error:', error);
      return this.sendFallbackResponse(res, error.message);
    }
  }

  /**
   * Handle special actions based on detected intent
   */
  async handleIntentActions(intentName, parameters, userId, user) {
    const actionData = {};

    switch (intentName) {
      case 'mentor.connect':
      case 'mentor.select':
        actionData.action = 'redirect';
        actionData.redirectTo = '/mentor';
        actionData.mentorPersona = parameters.mentorPersona || 'Arjun';
        break;

      case 'resume.analyze':
        actionData.action = 'redirect';
        actionData.redirectTo = '/features/resume-analyzer';
        // Include current resume score if available
        if (user?.resumeAnalysis) {
          actionData.currentScore = user.resumeAnalysis.atsScore;
        }
        break;

      case 'job.search':
        actionData.action = 'redirect';
        actionData.redirectTo = '/careers';
        actionData.filters = {
          skills: parameters.skills || user?.skills?.map(s => s.name) || [],
          location: parameters.location || ''
        };
        break;

      case 'interview.practice':
        actionData.action = 'redirect';
        actionData.redirectTo = '/mock-interview';
        break;

      case 'roadmap.view':
      case 'roadmap.create':
        actionData.action = 'redirect';
        actionData.redirectTo = '/solutions/roadmap';
        break;

      case 'scholarship.search':
        actionData.action = 'redirect';
        actionData.redirectTo = '/features/scholarships';
        break;

      case 'profile.view':
        actionData.action = 'redirect';
        actionData.redirectTo = '/dashboard';
        break;

      case 'profile.update':
        actionData.action = 'open_modal';
        actionData.modalType = 'profile_edit';
        actionData.field = parameters.field || 'all';
        break;

      case 'features.list':
        actionData.action = 'show_features';
        actionData.features = [
          { name: 'Resume Analyzer', path: '/features/resume-analyzer', icon: 'FileText' },
          { name: 'Job Search', path: '/careers', icon: 'Briefcase' },
          { name: 'AI Mentor', path: '/mentor', icon: 'MessageCircle' },
          { name: 'Mock Interview', path: '/mock-interview', icon: 'Video' },
          { name: 'Career Roadmap', path: '/solutions/roadmap', icon: 'Map' },
          { name: 'Scholarship Finder', path: '/features/scholarships', icon: 'Award' }
        ];
        break;

      default:
        // No special action needed
        break;
    }

    return actionData;
  }

  /**
   * Extract parameters from Dialogflow response
   */
  extractParameters(parameters) {
    if (!parameters || !parameters.fields) return {};

    const extracted = {};
    for (const [key, value] of Object.entries(parameters.fields)) {
      if (value.stringValue) {
        extracted[key] = value.stringValue;
      } else if (value.numberValue !== undefined) {
        extracted[key] = value.numberValue;
      } else if (value.boolValue !== undefined) {
        extracted[key] = value.boolValue;
      } else if (value.listValue && value.listValue.values) {
        extracted[key] = value.listValue.values.map(v => v.stringValue || v.numberValue);
      }
    }
    return extracted;
  }

  /**
   * Map language codes to Dialogflow language codes
   */
  getLanguageCode(language) {
    const languageMap = {
      en: 'en',
      hi: 'hi', // Hindi
      ta: 'ta', // Tamil
      te: 'te', // Telugu
      bn: 'bn', // Bengali
      mr: 'mr'  // Marathi
    };
    return languageMap[language] || 'en';
  }

  /**
   * Save conversation to database
   */
  async saveConversation(userId, userMessage, botResponse, intent, confidence) {
    try {
      // Find or create conversation for Dialogflow chatbot
      let conversation = await Conversation.findOne({
        userId,
        isActive: true,
        'mentorPersona.id': 'dialogflow-chatbot'
      });

      if (!conversation) {
        conversation = new Conversation({
          userId,
          mentorPersona: {
            id: 'dialogflow-chatbot',
            name: 'Career Assistant',
            specialty: 'Quick Help & Navigation'
          },
          messages: [],
          isActive: true,
          language: 'en'
        });
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: userMessage,
        metadata: {
          intent,
          confidence,
          timestamp: new Date()
        }
      });

      // Add bot response
      conversation.messages.push({
        role: 'assistant',
        content: botResponse,
        metadata: {
          source: 'dialogflow-cx',
          timestamp: new Date()
        }
      });

      conversation.lastMessageAt = new Date();
      await conversation.save();

      console.log('✅ Conversation saved to database');
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
      // Don't throw - conversation saving is not critical
    }
  }

  /**
   * Track analytics for chatbot interactions
   */
  async trackAnalytics(userId, intent, confidence) {
    try {
      // Import Analytics model (we'll create this)
      const Analytics = require('../models/Analytics');

      await Analytics.create({
        userId: userId || 'anonymous',
        eventType: 'chatbot_intent',
        eventData: {
          intent,
          confidence,
          source: 'dialogflow-cx'
        },
        timestamp: new Date()
      });

      console.log('📊 Analytics tracked:', intent);
    } catch (error) {
      console.error('❌ Error tracking analytics:', error);
      // Don't throw - analytics tracking is not critical
    }
  }

  /**
   * Send fallback response when Dialogflow fails
   */
  sendFallbackResponse(res, errorMessage) {
    const fallbackMessage = 'I\'m having trouble right now. Here are some quick links:\n\n' +
      '• Resume Analyzer - Analyze and improve your resume\n' +
      '• Job Search - Find remote opportunities\n' +
      '• AI Mentor - Get personalized career guidance\n' +
      '• Mock Interview - Practice interview questions\n' +
      '• Career Roadmap - Plan your learning path\n\n' +
      'You can also try asking: "What can you help me with?"';

    res.status(200).json({
      success: true,
      data: {
        response: fallbackMessage,
        intent: 'Fallback',
        confidence: 0,
        error: errorMessage,
        action: 'show_features'
      }
    });
  }

  /**
   * Health check endpoint
   */
  async getHealthCheck(req, res) {
    try {
      const isConfigured = this.isConfigured;

      res.status(200).json({
        success: true,
        data: {
          service: 'Dialogflow CX Chatbot',
          status: isConfigured ? 'active' : 'not configured',
          projectId: process.env.DIALOGFLOW_PROJECT_ID || 'not set',
          location: this.location || 'not set',
          agentId: process.env.DIALOGFLOW_AGENT_ID ? 'configured' : 'not set',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Chatbot health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }
}

module.exports = new ChatbotController();