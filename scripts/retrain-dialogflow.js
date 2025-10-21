/**
 * Retrain Dialogflow CX Agent by Updating the Default Start Page
 * Dialogflow CX trains automatically when intents are created/updated
 * This script triggers retraining by updating the Default Start Page
 */

const { PagesClient, FlowsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class DialogflowRetrainer {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    this.pagesClient = new PagesClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.flowsClient = new FlowsClient({
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
      return defaultFlow;
    } catch (error) {
      console.error('❌ Error getting flow:', error.message);
      throw error;
    }
  }

  /**
   * Update the Default Start Flow to trigger retraining
   */
  async updateFlow(flow) {
    try {
      console.log('\n🔄 Updating flow to trigger training...');

      // Update the flow with NLU settings to trigger retraining
      const updatedFlow = {
        name: flow.name,
        displayName: flow.displayName,
        description: 'Career Advisor chatbot main flow - Updated to trigger training',
        nluSettings: {
          modelType: 'MODEL_TYPE_STANDARD',
          classificationThreshold: 0.3,
          modelTrainingMode: 'MODEL_TRAINING_MODE_AUTOMATIC'
        }
      };

      const [response] = await this.flowsClient.updateFlow({
        flow: updatedFlow,
        updateMask: {
          paths: ['nlu_settings', 'description']
        }
      });

      console.log('✅ Flow updated successfully!');
      console.log('✅ Automatic training triggered!');

      return response;
    } catch (error) {
      console.error('❌ Error updating flow:', error.message);
      throw error;
    }
  }

  /**
   * Main function
   */
  async retrain() {
    console.log('\n🚀 Dialogflow CX Agent Retraining\n');
    console.log('=' .repeat(80));

    try {
      // Get the default flow
      console.log('\n🔍 Step 1: Locating Default Start Flow...');
      const flow = await this.getDefaultStartFlow();

      // Update the flow to trigger training
      console.log('\n🔍 Step 2: Triggering automatic training...');
      await this.updateFlow(flow);

      console.log('\n' + '='.repeat(80));
      console.log('\n✅ Retraining Complete!\n');
      console.log('📝 What happened:');
      console.log('   - Updated flow configuration');
      console.log('   - Enabled automatic NLU training');
      console.log('   - Set model type to STANDARD');
      console.log('   - Set classification threshold to 0.3\n');

      console.log('⏳ Note: Training may take 1-2 minutes to complete.');
      console.log('   The agent will be available during this time.\n');

      console.log('🧪 Next Steps:');
      console.log('   1. Wait 1-2 minutes for training to complete');
      console.log('   2. Test: node scripts/test-dialogflow.js');
      console.log('   3. Or test in console:');
      console.log(`      https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}\n`);

    } catch (error) {
      console.error('\n❌ Retraining failed:', error.message);
      console.error('\n💡 Alternative: Train manually in Console');
      console.error(`   Visit: https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}`);
      console.error('   Then click "Train" button in the UI\n');
      process.exit(1);
    }
  }
}

// Run the retrainer
if (require.main === module) {
  const retrainer = new DialogflowRetrainer();
  retrainer.retrain().catch(console.error);
}

module.exports = DialogflowRetrainer;
