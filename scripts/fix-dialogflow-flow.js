/**
 * Fix Dialogflow CX Flow Configuration
 * Links intents to the Default Start Flow and configures proper routes
 */

const { FlowsClient, IntentsClient, PagesClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class DialogflowFlowFixer {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    this.flowsClient = new FlowsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.intentsClient = new IntentsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.pagesClient = new PagesClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.agentPath = `projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}`;
  }

  /**
   * Get the Default Start Flow
   */
  async getDefaultStartFlow() {
    try {
      const [flows] = await this.flowsClient.listFlows({
        parent: this.agentPath
      });

      const defaultFlow = flows.find(flow => flow.displayName === 'Default Start Flow');

      if (!defaultFlow) {
        throw new Error('Default Start Flow not found');
      }

      console.log('✅ Found Default Start Flow');
      console.log(`   Flow Name: ${defaultFlow.name}`);

      return defaultFlow;
    } catch (error) {
      console.error('❌ Error getting flow:', error.message);
      throw error;
    }
  }

  /**
   * Get all intents
   */
  async getAllIntents() {
    try {
      const [intents] = await this.intentsClient.listIntents({
        parent: this.agentPath,
        languageCode: 'en'
      });

      console.log(`✅ Found ${intents.length} intents`);
      return intents;
    } catch (error) {
      console.error('❌ Error getting intents:', error.message);
      throw error;
    }
  }

  /**
   * Get the Start Page of a flow
   */
  async getStartPage(flowName) {
    try {
      const [pages] = await this.pagesClient.listPages({
        parent: flowName
      });

      const startPage = pages.find(page => page.displayName === 'START_PAGE');

      if (!startPage) {
        console.log('⚠️  Start Page not found, will use flow-level routes');
        return null;
      }

      console.log('✅ Found Start Page');
      return startPage;
    } catch (error) {
      console.error('❌ Error getting pages:', error.message);
      return null;
    }
  }

  /**
   * Create intent-based routes on the Start Page
   */
  async updateStartPageWithRoutes(flowName, intents) {
    try {
      console.log('\n🔧 Configuring Start Page with intent routes...');

      const [pages] = await this.pagesClient.listPages({
        parent: flowName
      });

      let startPage = pages.find(page => page.displayName === 'START_PAGE' || page.displayName === 'Start Page');

      if (!startPage) {
        // Get the first page or create routes at flow level
        console.log('⚠️  No Start Page found, using first page');
        startPage = pages[0];
      }

      if (!startPage) {
        console.log('❌ No pages found in flow');
        return false;
      }

      console.log(`   Using page: ${startPage.displayName}`);

      // Create routes for each intent
      const routes = [];

      // Map intents to their responses
      const intentResponses = {
        'Default Welcome Intent': [
          'Hello! I\'m your AI Career Assistant. I can help you with:\n\n• Resume analysis and ATS optimization\n• Job search and recommendations\n• Career roadmap planning\n• Mock interview practice\n• Scholarship opportunities\n• Connect with AI mentors\n\nWhat would you like to explore today?'
        ],
        'features.list': [
          'Here are all the features available on CareerCraft AI:\n\n📄 Resume Analyzer - Get ATS score and improvement tips\n💼 Job Search - Find opportunities matching your skills\n🤖 AI Mentor - Personalized career guidance\n🎥 Mock Interview - Practice with AI feedback\n🗺️ Career Roadmap - Plan your learning journey\n🎓 Scholarship Finder - Discover funding opportunities\n\nWhich one interests you?'
        ],
        'resume.analyze': [
          'I can help you analyze your resume! Our Resume Analyzer will:\n\n✓ Calculate your ATS compatibility score\n✓ Identify missing keywords\n✓ Suggest formatting improvements\n✓ Provide industry-specific tips\n\nLet me redirect you to the Resume Analyzer...'
        ],
        'job.search': [
          'I\'ll help you find the perfect job! Our Job Search feature offers:\n\n🎯 AI-powered job matching\n📊 Match percentage scores\n💰 Salary insights\n📍 Location filters\n🔄 Real-time job updates\n\nRedirecting you to Job Search...'
        ],
        'mentor.connect': [
          'Great choice! Our AI Mentors provide personalized career guidance. You can connect with:\n\n👨‍💼 Arjun - Tech Career Specialist\n👩‍💼 Priya - Business & Finance Expert\n👨‍🎓 Ravi - Academic & Research Guide\n\nLet me connect you with a mentor...'
        ],
        'interview.practice': [
          'Perfect! Our AI Mock Interview will help you:\n\n🎤 Practice with realistic questions\n📹 Record video responses\n🤖 Get AI feedback on answers\n📊 Track your improvement\n💡 Receive personalized tips\n\nTaking you to the Mock Interview...'
        ],
        'roadmap.view': [
          'Your personalized Career Roadmap includes:\n\n🎯 Clear learning milestones\n📚 Curated resources\n⏱️ Time estimates\n✅ Progress tracking\n🏆 Achievement badges\n\nOpening your Career Roadmap...'
        ],
        'roadmap.create': [
          'Let\'s create your personalized Career Roadmap! I\'ll help you:\n\n1. Define your career goal\n2. Assess current skills\n3. Identify skill gaps\n4. Build learning milestones\n5. Track progress\n\nRedirecting to Roadmap Generator...'
        ],
        'scholarship.search': [
          'I\'ll help you discover scholarship opportunities! Our Scholarship Finder provides:\n\n🎓 Personalized recommendations\n💰 Government & private scholarships\n📅 Application deadlines\n✅ Eligibility checking\n🔔 Deadline reminders\n\nTaking you to Scholarship Finder...'
        ],
        'profile.view': [
          'Opening your profile dashboard where you can:\n\n👤 Update personal information\n📊 View progress statistics\n🎯 Manage career goals\n💼 Track applications\n⚙️ Update preferences\n\nRedirecting to your dashboard...'
        ],
        'profile.update': [
          'I can help you update your profile! You can modify:\n\n• Personal information\n• Skills and expertise\n• Education history\n• Career goals\n• Preferences\n\nWhat would you like to update?'
        ],
        'help.general': [
          'I\'m here to help! You can:\n\n1. Ask about any feature (e.g., "How do I analyze my resume?")\n2. Request navigation (e.g., "Take me to job search")\n3. Get career advice (e.g., "How do I switch careers?")\n4. Explore options (e.g., "What can you do?")\n\nWhat specific help do you need?'
        ],
        'feedback.positive': [
          'You\'re very welcome! I\'m glad I could help. If you need anything else on your career journey, just ask!'
        ],
        'goodbye': [
          'Goodbye! Best of luck with your career journey. Come back anytime you need guidance!'
        ]
      };

      for (const intent of intents) {
        const intentName = intent.displayName;
        const responses = intentResponses[intentName];

        if (responses) {
          const route = {
            intent: intent.name,
            triggerFulfillment: {
              messages: responses.map(text => ({
                text: { text: [text] }
              }))
            }
          };

          routes.push(route);
        }
      }

      // Update the page with routes
      const updatedPage = {
        name: startPage.name,
        displayName: startPage.displayName,
        transitionRoutes: routes,
        entryFulfillment: startPage.entryFulfillment || {}
      };

      const [response] = await this.pagesClient.updatePage({
        page: updatedPage,
        updateMask: {
          paths: ['transition_routes']
        }
      });

      console.log(`✅ Updated page with ${routes.length} intent routes`);
      return true;

    } catch (error) {
      console.error('❌ Error updating page:', error.message);
      throw error;
    }
  }

  /**
   * Main fix function
   */
  async fix() {
    console.log('\n🚀 Fixing Dialogflow CX Flow Configuration\n');
    console.log('=' .repeat(80));

    try {
      // Step 1: Get the Default Start Flow
      console.log('\n🔍 Step 1: Getting Default Start Flow...');
      const flow = await this.getDefaultStartFlow();

      // Step 2: Get all intents
      console.log('\n🔍 Step 2: Getting intents...');
      const intents = await this.getAllIntents();

      if (intents.length === 0) {
        console.log('\n❌ No intents found! Run setup-dialogflow.js first.');
        return;
      }

      // Step 3: Update Start Page with routes
      console.log('\n🔍 Step 3: Configuring intent routes...');
      await this.updateStartPageWithRoutes(flow.name, intents);

      // Step 4: Update flow with NLU settings
      console.log('\n🔍 Step 4: Updating flow NLU settings...');
      const updatedFlow = {
        name: flow.name,
        displayName: flow.displayName,
        description: 'Career Advisor chatbot main flow',
        nluSettings: {
          modelType: 'MODEL_TYPE_STANDARD',
          classificationThreshold: 0.3,
          modelTrainingMode: 'MODEL_TRAINING_MODE_AUTOMATIC'
        }
      };

      await this.flowsClient.updateFlow({
        flow: updatedFlow,
        updateMask: {
          paths: ['nlu_settings', 'description']
        }
      });

      console.log('✅ Flow NLU settings updated');

      console.log('\n' + '='.repeat(80));
      console.log('\n✅ Flow Configuration Fixed!\n');
      console.log('📝 What was done:');
      console.log(`   - Configured ${intents.length} intent routes`);
      console.log('   - Linked intents to Start Page');
      console.log('   - Enabled automatic NLU training');
      console.log('   - Set model type to STANDARD\n');

      console.log('⏳ Training will complete in 1-2 minutes.');
      console.log('\n🧪 Next Steps:');
      console.log('   1. Wait 2 minutes for training');
      console.log('   2. Test in console: type "hello" in the test panel');
      console.log('   3. Or run: node scripts/test-dialogflow.js\n');

    } catch (error) {
      console.error('\n❌ Fix failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new DialogflowFlowFixer();
  fixer.fix().catch(console.error);
}

module.exports = DialogflowFlowFixer;
