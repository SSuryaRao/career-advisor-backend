/**
 * Configure Dialogflow CX Flow with Intent Routes
 * Adds transition routes directly to the flow for intent handling
 */

const { FlowsClient, IntentsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class FlowRouteConfigurator {
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

    this.agentPath = `projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}`;
  }

  /**
   * Get intent responses mapping
   */
  getIntentResponses() {
    return {
      'Default Welcome Intent': [
        'Hello! I\'m your AI Career Assistant. I can help you with:\n\n• Resume analysis and ATS optimization\n• Job search and recommendations\n• Career roadmap planning\n• Mock interview practice\n• Scholarship opportunities\n• Connect with AI mentors\n\nWhat would you like to explore today?'
      ],
      'features.list': [
        'Here are all the features available on CareerCraft AI:\n\n📄 Resume Analyzer - Get ATS score\n💼 Job Search - Find matching opportunities\n🤖 AI Mentor - Get career guidance\n🎥 Mock Interview - Practice interviews\n🗺️ Career Roadmap - Plan your learning\n🎓 Scholarship Finder - Find funding\n\nWhich interests you?'
      ],
      'resume.analyze': [
        'I can help analyze your resume! The Resume Analyzer provides:\n\n✓ ATS compatibility score\n✓ Missing keywords\n✓ Formatting improvements\n✓ Industry-specific tips\n\nRedirecting to Resume Analyzer...'
      ],
      'job.search': [
        'I\'ll help you find jobs! Job Search offers:\n\n🎯 AI-powered matching\n📊 Match scores\n💰 Salary insights\n📍 Location filters\n\nRedirecting to Job Search...'
      ],
      'mentor.connect': [
        'Connect with our AI Mentors:\n\n👨‍💼 Arjun - Tech Career Specialist\n👩‍💼 Priya - Business & Finance Expert\n👨‍🎓 Ravi - Academic & Research Guide\n\nConnecting you now...'
      ],
      'interview.practice': [
        'Mock Interview features:\n\n🎤 Realistic questions\n📹 Video recording\n🤖 AI feedback\n📊 Progress tracking\n\nStarting interview...'
      ],
      'roadmap.view': [
        'Your Career Roadmap includes:\n\n🎯 Learning milestones\n📚 Curated resources\n⏱️ Time estimates\n✅ Progress tracking\n\nOpening roadmap...'
      ],
      'roadmap.create': [
        'Let\'s create your Career Roadmap!\n\n1. Define career goal\n2. Assess current skills\n3. Identify skill gaps\n4. Build milestones\n\nStarting roadmap generator...'
      ],
      'scholarship.search': [
        'Scholarship Finder provides:\n\n🎓 Personalized recommendations\n💰 Government & private scholarships\n📅 Application deadlines\n✅ Eligibility checking\n\nSearching scholarships...'
      ],
      'profile.view': [
        'Profile dashboard features:\n\n👤 Personal information\n📊 Progress statistics\n🎯 Career goals\n💼 Application tracking\n\nOpening profile...'
      ],
      'profile.update': [
        'You can update:\n\n• Personal info\n• Skills\n• Education\n• Career goals\n\nWhat would you like to update?'
      ],
      'help.general': [
        'I can help with:\n\n1. Feature questions\n2. Navigation\n3. Career advice\n4. General guidance\n\nWhat do you need help with?'
      ],
      'feedback.positive': [
        'You\'re welcome! Happy to help with your career journey!'
      ],
      'goodbye': [
        'Goodbye! Best of luck with your career. Come back anytime!'
      ]
    };
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
   * Get Default Start Flow
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
      return defaultFlow;
    } catch (error) {
      console.error('❌ Error getting flow:', error.message);
      throw error;
    }
  }

  /**
   * Configure flow with transition routes
   */
  async configureFlowRoutes(flow, intents) {
    try {
      console.log('\n🔧 Configuring flow transition routes...');

      const intentResponses = this.getIntentResponses();
      const transitionRoutes = [];

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

          transitionRoutes.push(route);
          console.log(`   ✓ Added route for: ${intentName}`);
        }
      }

      // Update the flow with transition routes
      const updatedFlow = {
        name: flow.name,
        displayName: flow.displayName,
        description: 'Career Advisor main conversation flow',
        transitionRoutes: transitionRoutes,
        nluSettings: {
          modelType: 1, // MODEL_TYPE_STANDARD
          classificationThreshold: 0.3,
          modelTrainingMode: 1 // AUTOMATIC
        }
      };

      const [response] = await this.flowsClient.updateFlow({
        flow: updatedFlow,
        updateMask: {
          paths: ['transition_routes', 'nlu_settings', 'description']
        }
      });

      console.log(`\n✅ Flow updated with ${transitionRoutes.length} routes`);
      return response;

    } catch (error) {
      console.error('❌ Error configuring routes:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  /**
   * Main configuration function
   */
  async configure() {
    console.log('\n🚀 Configuring Dialogflow CX Flow Routes\n');
    console.log('=' .repeat(80));

    try {
      // Step 1: Get intents
      console.log('\n📋 Step 1: Getting intents...');
      const intents = await this.getAllIntents();

      if (intents.length === 0) {
        console.log('\n❌ No intents found! Run setup-dialogflow.js first.');
        return;
      }

      // Step 2: Get flow
      console.log('\n📋 Step 2: Getting Default Start Flow...');
      const flow = await this.getDefaultStartFlow();

      // Step 3: Configure routes
      console.log('\n📋 Step 3: Configuring transition routes...');
      await this.configureFlowRoutes(flow, intents);

      console.log('\n' + '='.repeat(80));
      console.log('\n✅ Configuration Complete!\n');
      console.log('📝 Summary:');
      console.log(`   - ${intents.length} intents configured`);
      console.log('   - Transition routes added to flow');
      console.log('   - Automatic NLU training enabled');
      console.log('   - Model type: STANDARD');
      console.log('   - Classification threshold: 0.3\n');

      console.log('⏳ Training will complete automatically (1-2 minutes)');
      console.log('\n🧪 Test Now:');
      console.log('   1. Go to Dialogflow console');
      console.log('   2. Type "hello" in test panel');
      console.log('   3. Or wait 2 min and run: node scripts/test-dialogflow.js\n');

      console.log('🌐 Console URL:');
      console.log(`   https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}\n`);

    } catch (error) {
      console.error('\n❌ Configuration failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the configurator
if (require.main === module) {
  const configurator = new FlowRouteConfigurator();
  configurator.configure().catch(console.error);
}

module.exports = FlowRouteConfigurator;
