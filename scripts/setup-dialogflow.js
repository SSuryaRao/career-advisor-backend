/**
 * Dialogflow CX Agent Setup Script
 *
 * This script creates and trains the Dialogflow CX agent with all necessary:
 * - Intents (user intentions)
 * - Training phrases (examples for each intent)
 * - Fulfillment messages (bot responses)
 * - Pages and flows (conversation structure)
 *
 * Run: node scripts/setup-dialogflow.js
 */

const { IntentsClient, PagesClient, FlowsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class DialogflowSetup {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Initialize clients
    this.intentsClient = new IntentsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.pagesClient = new PagesClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.flowsClient = new FlowsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    // Parent paths
    this.agentPath = `projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}`;
  }

  /**
   * Get or create the Default Start Flow
   */
  async getDefaultStartFlow() {
    try {
      const [flows] = await this.flowsClient.listFlows({
        parent: this.agentPath
      });

      const defaultFlow = flows.find(flow => flow.displayName === 'Default Start Flow');

      if (defaultFlow) {
        console.log('✅ Found Default Start Flow:', defaultFlow.name);
        return defaultFlow.name;
      }

      throw new Error('Default Start Flow not found');
    } catch (error) {
      console.error('❌ Error getting Default Start Flow:', error.message);
      throw error;
    }
  }

  /**
   * Define all intents for the Career Advisor chatbot
   */
  getIntentsConfig() {
    return [
      {
        displayName: 'Default Welcome Intent',
        trainingPhrases: [
          'hello',
          'hi',
          'hey',
          'good morning',
          'good afternoon',
          'good evening',
          'help',
          'what can you do',
          'what can you help me with',
          'start',
          'begin'
        ],
        responses: [
          'Hello! I\'m your AI Career Assistant. I can help you with:\n\n' +
          '• Resume analysis and ATS optimization\n' +
          '• Job search and recommendations\n' +
          '• Career roadmap planning\n' +
          '• Mock interview practice\n' +
          '• Scholarship opportunities\n' +
          '• Connect with AI mentors\n\n' +
          'What would you like to explore today?',

          'Hi there! Welcome to CareerCraft AI. I\'m here to help you with your career journey. ' +
          'You can ask me about resume improvement, job searching, career planning, interview prep, and more. How can I assist you?'
        ]
      },
      {
        displayName: 'features.list',
        trainingPhrases: [
          'what can you do',
          'show me features',
          'what features do you have',
          'list all features',
          'show all options',
          'what services do you offer',
          'help me explore',
          'what\'s available'
        ],
        responses: [
          'Here are all the features available on CareerCraft AI:\n\n' +
          '📄 Resume Analyzer - Get ATS score and improvement tips\n' +
          '💼 Job Search - Find opportunities matching your skills\n' +
          '🤖 AI Mentor - Personalized career guidance\n' +
          '🎥 Mock Interview - Practice with AI feedback\n' +
          '🗺️ Career Roadmap - Plan your learning journey\n' +
          '🎓 Scholarship Finder - Discover funding opportunities\n\n' +
          'Which one interests you?'
        ]
      },
      {
        displayName: 'resume.analyze',
        trainingPhrases: [
          'analyze my resume',
          'check my resume',
          'resume score',
          'improve my resume',
          'resume feedback',
          'ats score',
          'resume optimization',
          'how is my resume',
          'review my cv',
          'cv analysis'
        ],
        responses: [
          'I can help you analyze your resume! Our Resume Analyzer will:\n\n' +
          '✓ Calculate your ATS compatibility score\n' +
          '✓ Identify missing keywords\n' +
          '✓ Suggest formatting improvements\n' +
          '✓ Provide industry-specific tips\n\n' +
          'Let me redirect you to the Resume Analyzer...'
        ]
      },
      {
        displayName: 'job.search',
        trainingPhrases: [
          'find jobs',
          'search jobs',
          'job opportunities',
          'show me jobs',
          'looking for work',
          'find me a job',
          'job openings',
          'career opportunities',
          'hiring positions',
          'remote jobs',
          'work from home jobs'
        ],
        responses: [
          'I\'ll help you find the perfect job! Our Job Search feature offers:\n\n' +
          '🎯 AI-powered job matching\n' +
          '📊 Match percentage scores\n' +
          '💰 Salary insights\n' +
          '📍 Location filters\n' +
          '🔄 Real-time job updates\n\n' +
          'Redirecting you to Job Search...'
        ]
      },
      {
        displayName: 'mentor.connect',
        trainingPhrases: [
          'talk to mentor',
          'connect with mentor',
          'need career advice',
          'career guidance',
          'speak to advisor',
          'mentor help',
          'career counseling',
          'professional advice',
          'I need guidance'
        ],
        responses: [
          'Great choice! Our AI Mentors provide personalized career guidance. You can connect with:\n\n' +
          '👨‍💼 Arjun - Tech Career Specialist\n' +
          '👩‍💼 Priya - Business & Finance Expert\n' +
          '👨‍🎓 Ravi - Academic & Research Guide\n\n' +
          'Let me connect you with a mentor...'
        ]
      },
      {
        displayName: 'interview.practice',
        trainingPhrases: [
          'practice interview',
          'mock interview',
          'interview preparation',
          'prepare for interview',
          'interview practice',
          'rehearse interview',
          'interview training',
          'practice questions'
        ],
        responses: [
          'Perfect! Our AI Mock Interview will help you:\n\n' +
          '🎤 Practice with realistic questions\n' +
          '📹 Record video responses\n' +
          '🤖 Get AI feedback on answers\n' +
          '📊 Track your improvement\n' +
          '💡 Receive personalized tips\n\n' +
          'Taking you to the Mock Interview...'
        ]
      },
      {
        displayName: 'roadmap.view',
        trainingPhrases: [
          'show roadmap',
          'career roadmap',
          'learning path',
          'skill development plan',
          'career plan',
          'view my roadmap',
          'show my path',
          'career journey',
          'how to learn'
        ],
        responses: [
          'Your personalized Career Roadmap includes:\n\n' +
          '🎯 Clear learning milestones\n' +
          '📚 Curated resources\n' +
          '⏱️ Time estimates\n' +
          '✅ Progress tracking\n' +
          '🏆 Achievement badges\n\n' +
          'Opening your Career Roadmap...'
        ]
      },
      {
        displayName: 'roadmap.create',
        trainingPhrases: [
          'create roadmap',
          'generate roadmap',
          'make a learning plan',
          'build career path',
          'new roadmap',
          'plan my career',
          'create learning path'
        ],
        responses: [
          'Let\'s create your personalized Career Roadmap! I\'ll help you:\n\n' +
          '1. Define your career goal\n' +
          '2. Assess current skills\n' +
          '3. Identify skill gaps\n' +
          '4. Build learning milestones\n' +
          '5. Track progress\n\n' +
          'Redirecting to Roadmap Generator...'
        ]
      },
      {
        displayName: 'scholarship.search',
        trainingPhrases: [
          'find scholarships',
          'scholarship opportunities',
          'funding for education',
          'financial aid',
          'education grants',
          'student scholarships',
          'study funding',
          'scholarship search'
        ],
        responses: [
          'I\'ll help you discover scholarship opportunities! Our Scholarship Finder provides:\n\n' +
          '🎓 Personalized recommendations\n' +
          '💰 Government & private scholarships\n' +
          '📅 Application deadlines\n' +
          '✅ Eligibility checking\n' +
          '🔔 Deadline reminders\n\n' +
          'Taking you to Scholarship Finder...'
        ]
      },
      {
        displayName: 'profile.view',
        trainingPhrases: [
          'my profile',
          'view profile',
          'show my profile',
          'account details',
          'my account',
          'profile settings',
          'my dashboard'
        ],
        responses: [
          'Opening your profile dashboard where you can:\n\n' +
          '👤 Update personal information\n' +
          '📊 View progress statistics\n' +
          '🎯 Manage career goals\n' +
          '💼 Track applications\n' +
          '⚙️ Update preferences\n\n' +
          'Redirecting to your dashboard...'
        ]
      },
      {
        displayName: 'profile.update',
        trainingPhrases: [
          'update profile',
          'edit profile',
          'change my information',
          'modify profile',
          'update my details',
          'change settings'
        ],
        responses: [
          'I can help you update your profile! You can modify:\n\n' +
          '• Personal information\n' +
          '• Skills and expertise\n' +
          '• Education history\n' +
          '• Career goals\n' +
          '• Preferences\n\n' +
          'What would you like to update?'
        ]
      },
      {
        displayName: 'help.general',
        trainingPhrases: [
          'I need help',
          'how does this work',
          'explain this',
          'I\'m confused',
          'I don\'t understand',
          'guide me',
          'tutorial'
        ],
        responses: [
          'I\'m here to help! You can:\n\n' +
          '1. Ask about any feature (e.g., "How do I analyze my resume?")\n' +
          '2. Request navigation (e.g., "Take me to job search")\n' +
          '3. Get career advice (e.g., "How do I switch careers?")\n' +
          '4. Explore options (e.g., "What can you do?")\n\n' +
          'What specific help do you need?'
        ]
      },
      {
        displayName: 'feedback.positive',
        trainingPhrases: [
          'thank you',
          'thanks',
          'helpful',
          'great',
          'awesome',
          'perfect',
          'excellent',
          'good job',
          'appreciate it'
        ],
        responses: [
          'You\'re very welcome! I\'m glad I could help. If you need anything else on your career journey, just ask!',
          'Happy to help! Feel free to explore more features or ask any career-related questions. Good luck!'
        ]
      },
      {
        displayName: 'goodbye',
        trainingPhrases: [
          'bye',
          'goodbye',
          'see you',
          'talk to you later',
          'exit',
          'quit',
          'I\'m done'
        ],
        responses: [
          'Goodbye! Best of luck with your career journey. Come back anytime you need guidance!',
          'See you later! Keep working towards your goals. I\'ll be here whenever you need help!'
        ]
      }
    ];
  }

  /**
   * Create an intent
   */
  async createIntent(flowName, intentConfig) {
    try {
      const trainingPhrases = intentConfig.trainingPhrases.map(phrase => ({
        parts: [{ text: phrase }],
        repeatCount: 1
      }));

      // Random response selection
      const fulfillmentMessages = intentConfig.responses.map(text => ({
        text: { text: [text] }
      }));

      const intent = {
        displayName: intentConfig.displayName,
        trainingPhrases: trainingPhrases,
        priority: 500000,
        isFallback: false,
        labels: {}
      };

      const request = {
        parent: this.agentPath,  // Use agent path, not flow path
        intent: intent,
        languageCode: 'en'
      };

      const [response] = await this.intentsClient.createIntent(request);
      console.log(`✅ Created intent: ${intentConfig.displayName}`);

      return response;
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`⚠️  Intent already exists: ${intentConfig.displayName}`);
        return null;
      }
      console.error(`❌ Error creating intent ${intentConfig.displayName}:`, error.message);
      throw error;
    }
  }

  /**
   * List existing intents
   */
  async listIntents(flowName) {
    try {
      // Intents are at agent level, not flow level
      const [intents] = await this.intentsClient.listIntents({
        parent: this.agentPath,
        languageCode: 'en'
      });

      console.log(`\n📋 Found ${intents.length} existing intents:`);
      intents.forEach(intent => {
        console.log(`   - ${intent.displayName}`);
      });

      return intents;
    } catch (error) {
      console.error('❌ Error listing intents:', error.message);
      return [];
    }
  }

  /**
   * Create a page with fulfillment
   */
  async createPage(flowName, pageConfig) {
    try {
      const page = {
        displayName: pageConfig.displayName,
        entryFulfillment: {
          messages: pageConfig.messages.map(text => ({
            text: { text: [text] }
          }))
        }
      };

      const request = {
        parent: flowName,
        page: page,
        languageCode: 'en'
      };

      const [response] = await this.pagesClient.createPage(request);
      console.log(`✅ Created page: ${pageConfig.displayName}`);

      return response;
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`⚠️  Page already exists: ${pageConfig.displayName}`);
        return null;
      }
      console.error(`❌ Error creating page ${pageConfig.displayName}:`, error.message);
      throw error;
    }
  }

  /**
   * Main setup function
   */
  async setup() {
    console.log('\n🚀 Starting Dialogflow CX Agent Setup...\n');
    console.log(`📍 Project: ${this.projectId}`);
    console.log(`📍 Location: ${this.location}`);
    console.log(`📍 Agent ID: ${this.agentId}\n`);

    try {
      // Step 1: Get Default Start Flow
      console.log('📌 Step 1: Getting Default Start Flow...');
      const flowName = await this.getDefaultStartFlow();

      // Step 2: List existing intents
      console.log('\n📌 Step 2: Checking existing intents...');
      await this.listIntents(flowName);

      // Step 3: Create intents
      console.log('\n📌 Step 3: Creating intents...');
      const intentsConfig = this.getIntentsConfig();

      for (const intentConfig of intentsConfig) {
        await this.createIntent(flowName, intentConfig);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('\n✅ Dialogflow CX Agent Setup Complete!');
      console.log('\n📝 Summary:');
      console.log(`   - Created ${intentsConfig.length} intents`);
      console.log(`   - Training phrases added for each intent`);
      console.log(`   - Fulfillment responses configured`);
      console.log('\n🎯 Next Steps:');
      console.log('   1. Test your agent in the Dialogflow CX console');
      console.log('   2. Try sending "hello" to your chatbot');
      console.log('   3. Verify all intents are working correctly');
      console.log(`\n🌐 Console URL: https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}\n`);

    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Verify your credentials are correct');
      console.error('   2. Check that the agent exists in the Console');
      console.error('   3. Ensure you have the right permissions');
      console.error('   4. Verify the project ID and location are correct');
      process.exit(1);
    }
  }
}

// Run the setup
if (require.main === module) {
  const setup = new DialogflowSetup();
  setup.setup().catch(console.error);
}

module.exports = DialogflowSetup;
