const { SessionsClient } = require('@google-cloud/dialogflow-cx');

class ChatbotController {
  constructor() {
    // Initialize Dialogflow CX client
    this.sessionsClient = new SessionsClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.DIALOGFLOW_PROJECT_ID,
    });
    
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'global';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
  }

  async sendMessage(req, res) {
    try {
      const { message, sessionId } = req.body;
      
      if (!message || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Message and sessionId are required'
        });
      }

      // Create session path
      const sessionPath = this.sessionsClient.projectLocationAgentSessionPath(
        this.projectId,
        this.location,
        this.agentId,
        sessionId
      );

      console.log('🤖 Dialogflow CX session path:', sessionPath);
      console.log('💬 User message:', message);

      // Create the request
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message,
          },
          languageCode: 'en',
        },
      };

      // Send request to Dialogflow CX
      const [response] = await this.sessionsClient.detectIntent(request);
      
      console.log('🤖 Dialogflow CX response:', JSON.stringify(response.queryResult, null, 2));

      // Extract response text
      const botResponse = response.queryResult.responseMessages
        .filter(msg => msg.text)
        .map(msg => msg.text.text[0])
        .join(' ') || 'I apologize, but I didn\'t understand that. Can you please rephrase your question?';

      res.status(200).json({
        success: true,
        data: {
          response: botResponse,
          intent: response.queryResult.intent?.displayName || 'Unknown',
          confidence: response.queryResult.intentDetectionConfidence || 0
        }
      });

    } catch (error) {
      console.error('❌ Chatbot error:', error);
      
      // Return fallback response for common issues
      const fallbackMessage = 'I\'m having trouble connecting right now. Here are some quick links: ' +
        'Resume Analyzer (Features → Resume Analyzer), ' +
        'Career Roadmaps (Solutions → Roadmap), ' +
        'Mock Interview (Solutions → AI Mock Interview), ' +
        'Scholarships (Features → Scholarship Finder).';
      
      res.status(200).json({
        success: true,
        data: {
          response: fallbackMessage,
          intent: 'Fallback',
          confidence: 0,
          error: 'Service temporarily unavailable'
        }
      });
    }
  }

  async getHealthCheck(req, res) {
    try {
      const isConfigured = !!(
        process.env.DIALOGFLOW_PROJECT_ID &&
        process.env.DIALOGFLOW_AGENT_ID &&
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );

      res.status(200).json({
        success: true,
        data: {
          service: 'Chatbot Service',
          status: isConfigured ? 'configured' : 'not configured',
          projectId: process.env.DIALOGFLOW_PROJECT_ID || 'not set',
          location: this.location,
          agentId: process.env.DIALOGFLOW_AGENT_ID || 'not set'
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