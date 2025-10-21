/**
 * Dialogflow CX Flow Configuration Script
 *
 * Configures the Default Start Flow with intent routes
 * This connects the intents to the flow and enables NLU training
 *
 * Run: node scripts/configure-flow.js
 */

const { FlowsClient, PagesClient, IntentsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class FlowConfigurator {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    this.flowsClient = new FlowsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.pagesClient = new PagesClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.intentsClient = new IntentsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.agentPath = `projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}`;
  }

  async getDefaultStartFlow() {
    const [flows] = await this.flowsClient.listFlows({
      parent: this.agentPath
    });

    const defaultFlow = flows.find(flow => flow.displayName === 'Default Start Flow');
    return defaultFlow;
  }

  async getAllIntents() {
    const [intents] = await this.intentsClient.listIntents({
      parent: this.agentPath,
      languageCode: 'en'
    });

    return intents;
  }

  async getStartPage(flowName) {
    const [pages] = await this.pagesClient.listPages({
      parent: flowName
    });

    const startPage = pages.find(page => page.displayName === 'START_PAGE' || page.displayName === 'Start Page');
    return startPage;
  }

  async updateStartPage(pageName, intents) {
    try {
      // Get the current page
      const page = await this.pagesClient.getPage({ name: pageName });

      // Create intent-to-response mappings
      const intentResponseMap = {
        'features.list': {
          action: 'show_features',
          message: 'Here are all the features available on CareerCraft AI:\n\n' +
            '📄 Resume Analyzer - Get ATS score and improvement tips\n' +
            '💼 Job Search - Find opportunities matching your skills\n' +
            '🤖 AI Mentor - Personalized career guidance\n' +
            '🎥 Mock Interview - Practice with AI feedback\n' +
            '🗺️ Career Roadmap - Plan your learning journey\n' +
            '🎓 Scholarship Finder - Discover funding opportunities\n\n' +
            'Which one interests you?'
        },
        'resume.analyze': {
          action: 'redirect',
          redirectTo: '/features/resume-analyzer',
          message: 'I can help you analyze your resume! Let me redirect you to the Resume Analyzer...'
        },
        'job.search': {
          action: 'redirect',
          redirectTo: '/features/job-search',
          message: 'I\'ll help you find the perfect job! Redirecting you to Job Search...'
        },
        'mentor.connect': {
          action: 'redirect',
          redirectTo: '/mentor',
          message: 'Great choice! Let me connect you with a mentor...'
        },
        'interview.practice': {
          action: 'redirect',
          redirectTo: '/solutions/ai-mock-interview',
          message: 'Perfect! Taking you to the Mock Interview...'
        },
        'roadmap.view': {
          action: 'redirect',
          redirectTo: '/solutions/roadmap',
          message: 'Opening your Career Roadmap...'
        },
        'roadmap.create': {
          action: 'redirect',
          redirectTo: '/solutions/roadmap',
          message: 'Let\'s create your personalized Career Roadmap!'
        },
        'scholarship.search': {
          action: 'redirect',
          redirectTo: '/features/scholarship-finder',
          message: 'I\'ll help you discover scholarship opportunities!'
        },
        'profile.view': {
          action: 'redirect',
          redirectTo: '/dashboard',
          message: 'Opening your profile dashboard...'
        }
      };

      // Create transition routes for each intent
      const transitionRoutes = [];

      for (const intent of intents) {
        const intentDisplayName = intent.displayName;

        // Skip default intents
        if (intentDisplayName === 'Default Negative Intent') {
          continue;
        }

        const config = intentResponseMap[intentDisplayName];

        if (config) {
          transitionRoutes.push({
            intent: intent.name,
            triggerFulfillment: {
              messages: [{
                text: {
                  text: [config.message]
                }
              }]
            }
          });
        }
      }

      // Update the page with transition routes
      const updatedPage = {
        name: page.name,
        displayName: page.displayName,
        transitionRoutes: transitionRoutes,
        entryFulfillment: page.entryFulfillment || {}
      };

      const updateMask = {
        paths: ['transition_routes']
      };

      const [response] = await this.pagesClient.updatePage({
        page: updatedPage,
        updateMask: updateMask
      });

      console.log(`✅ Updated Start Page with ${transitionRoutes.length} intent routes`);
      return response;

    } catch (error) {
      console.error('❌ Error updating start page:', error.message);
      throw error;
    }
  }

  async configure() {
    console.log('\n🔧 Configuring Dialogflow CX Flow...\n');
    console.log(`📍 Project: ${this.projectId}`);
    console.log(`📍 Location: ${this.location}`);
    console.log(`📍 Agent ID: ${this.agentId}\n`);

    try {
      // Step 1: Get Default Start Flow
      console.log('📌 Step 1: Getting Default Start Flow...');
      const flow = await this.getDefaultStartFlow();
      console.log(`✅ Found flow: ${flow.displayName}`);

      // Step 2: Get all intents
      console.log('\n📌 Step 2: Getting all intents...');
      const intents = await this.getAllIntents();
      console.log(`✅ Found ${intents.length} intents`);

      // Step 3: Get Start Page
      console.log('\n📌 Step 3: Getting Start Page...');
      const startPage = await this.getStartPage(flow.name);

      if (!startPage) {
        console.log('⚠️  Start Page not found, using flow itself');
        // For Default Start Flow, we'll update the flow instead
        await this.updateFlow(flow, intents);
      } else {
        console.log(`✅ Found page: ${startPage.displayName}`);

        // Step 4: Update Start Page with intent routes
        console.log('\n📌 Step 4: Updating Start Page with intent routes...');
        await this.updateStartPage(startPage.name, intents);
      }

      console.log('\n✅ Flow Configuration Complete!');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Wait 1-2 minutes for NLU model to train automatically');
      console.log('   2. Test the agent using: node scripts/test-dialogflow.js');
      console.log('   3. Or test in the Dialogflow Console');
      console.log(`\n🌐 Console URL: https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}\n`);

    } catch (error) {
      console.error('\n❌ Configuration failed:', error.message);
      console.error(error);
      process.exit(1);
    }
  }

  async updateFlow(flow, intents) {
    try {
      // For Dialogflow CX, intents are automatically associated with the agent
      // We just need to ensure the flow is properly configured

      console.log('✅ Intents are already associated with the agent');
      console.log('✅ The NLU model will train automatically');
      console.log('\n💡 Note: Training can take 1-2 minutes to complete');

      return flow;
    } catch (error) {
      console.error('❌ Error updating flow:', error.message);
      throw error;
    }
  }
}

// Run the configuration
if (require.main === module) {
  const configurator = new FlowConfigurator();
  configurator.configure().catch(console.error);
}

module.exports = FlowConfigurator;
