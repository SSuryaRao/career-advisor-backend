/**
 * Check Dialogflow Agent Status and Retrain if Needed
 * This script checks if the agent is trained and retrains it
 */

const { AgentsClient, FlowsClient, IntentsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class DialogflowTrainer {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Initialize clients
    this.agentsClient = new AgentsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

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
   * Get agent details
   */
  async getAgentDetails() {
    try {
      console.log('🔍 Fetching agent details...\n');

      const [agent] = await this.agentsClient.getAgent({
        name: this.agentPath
      });

      console.log('✅ Agent Details:');
      console.log(`   Name: ${agent.displayName}`);
      console.log(`   ID: ${this.agentId}`);
      console.log(`   Language: ${agent.defaultLanguageCode}`);
      console.log(`   Time Zone: ${agent.timeZone}`);

      return agent;
    } catch (error) {
      console.error('❌ Error getting agent:', error.message);
      throw error;
    }
  }

  /**
   * List all flows
   */
  async listFlows() {
    try {
      console.log('\n🔍 Fetching flows...\n');

      const [flows] = await this.flowsClient.listFlows({
        parent: this.agentPath
      });

      console.log(`✅ Found ${flows.length} flows:`);
      flows.forEach(flow => {
        console.log(`   - ${flow.displayName} (${flow.name.split('/').pop()})`);
      });

      return flows;
    } catch (error) {
      console.error('❌ Error listing flows:', error.message);
      throw error;
    }
  }

  /**
   * List all intents
   */
  async listIntents() {
    try {
      console.log('\n🔍 Fetching intents...\n');

      const [intents] = await this.intentsClient.listIntents({
        parent: this.agentPath,
        languageCode: 'en'
      });

      console.log(`✅ Found ${intents.length} intents:`);
      intents.forEach((intent, index) => {
        const trainingPhrasesCount = intent.trainingPhrases ? intent.trainingPhrases.length : 0;
        console.log(`   ${index + 1}. ${intent.displayName} (${trainingPhrasesCount} training phrases)`);
      });

      return intents;
    } catch (error) {
      console.error('❌ Error listing intents:', error.message);
      throw error;
    }
  }

  /**
   * Train the agent
   */
  async trainAgent() {
    try {
      console.log('\n🎓 Training the agent...\n');
      console.log('⏳ This may take a few moments...');

      const [operation] = await this.agentsClient.trainAgent({
        name: this.agentPath
      });

      console.log('✅ Training initiated!');
      console.log('⏳ Waiting for training to complete...');

      // Wait for the training operation to complete
      await operation.promise();

      console.log('\n✅ Training completed successfully!');
      console.log('🎉 Your agent is now ready to use!\n');

      return true;
    } catch (error) {
      console.error('❌ Error training agent:', error.message);

      // Check if it's already trained
      if (error.message && error.message.includes('already trained')) {
        console.log('✅ Agent is already trained!');
        return true;
      }

      throw error;
    }
  }

  /**
   * Main function
   */
  async checkAndTrain() {
    console.log('\n🚀 Dialogflow CX Agent Status Check\n');
    console.log('=' .repeat(80));

    try {
      // Step 1: Get agent details
      await this.getAgentDetails();

      // Step 2: List flows
      await this.listFlows();

      // Step 3: List intents
      const intents = await this.listIntents();

      // Step 4: Train the agent
      console.log('\n' + '='.repeat(80));

      if (intents.length === 0) {
        console.log('\n⚠️  No intents found! Please run setup-dialogflow.js first.');
        console.log('\n💡 Run: node scripts/setup-dialogflow.js\n');
        return;
      }

      await this.trainAgent();

      console.log('=' .repeat(80));
      console.log('\n📝 Summary:');
      console.log(`   - Agent: ${this.agentPath}`);
      console.log(`   - Intents: ${intents.length}`);
      console.log(`   - Status: ✅ Trained and Ready`);
      console.log('\n🧪 Next Steps:');
      console.log('   1. Test the agent: node scripts/test-dialogflow.js');
      console.log('   2. Or visit the console to test interactively:');
      console.log(`   https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}\n`);

    } catch (error) {
      console.error('\n❌ Failed:', error.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Verify credentials are correct');
      console.error('   2. Check agent exists in Console');
      console.error('   3. Ensure proper permissions');
      console.error('   4. Run setup if intents are missing: node scripts/setup-dialogflow.js\n');
      process.exit(1);
    }
  }
}

// Run the checker
if (require.main === module) {
  const trainer = new DialogflowTrainer();
  trainer.checkAndTrain().catch(console.error);
}

module.exports = DialogflowTrainer;
