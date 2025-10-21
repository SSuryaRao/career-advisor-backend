/**
 * Diagnose Dialogflow CX Agent Issues
 *
 * This script provides detailed diagnostics about the agent status,
 * flows, intents, and any potential training issues.
 */

const { AgentsClient, FlowsClient, IntentsClient, SessionsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class AgentDiagnostics {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const clientConfig = {
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    };

    this.agentsClient = new AgentsClient(clientConfig);
    this.flowsClient = new FlowsClient(clientConfig);
    this.intentsClient = new IntentsClient(clientConfig);
    this.sessionsClient = new SessionsClient(clientConfig);
  }

  async diagnose() {
    console.log('\n🔍 DIALOGFLOW CX AGENT DIAGNOSTICS\n');
    console.log('='.repeat(80));
    console.log(`📍 Project: ${this.projectId}`);
    console.log(`📍 Location: ${this.location}`);
    console.log(`📍 Agent ID: ${this.agentId}`);
    console.log('='.repeat(80));

    try {
      // 1. Check Agent Status
      await this.checkAgentStatus();

      // 2. Check Flows
      await this.checkFlows();

      // 3. Check Intents
      await this.checkIntents();

      // 4. Test Intent Detection
      await this.testIntentDetection();

      console.log('\n' + '='.repeat(80));
      console.log('✅ DIAGNOSTICS COMPLETE');
      console.log('='.repeat(80));

    } catch (error) {
      console.error('\n❌ DIAGNOSTICS FAILED\n');
      console.error('Error:', error.message);
      console.error('\nFull error:', error);
      throw error;
    }
  }

  async checkAgentStatus() {
    console.log('\n\n📊 1. AGENT STATUS\n');
    console.log('─'.repeat(80));

    try {
      const agentPath = this.agentsClient.agentPath(
        this.projectId,
        this.location,
        this.agentId
      );

      const [agent] = await this.agentsClient.getAgent({ name: agentPath });

      console.log(`   Display Name: ${agent.displayName}`);
      console.log(`   Default Language: ${agent.defaultLanguageCode}`);
      console.log(`   Time Zone: ${agent.timeZone}`);
      console.log(`   Enable Stackdriver Logging: ${agent.enableStackdriverLogging}`);
      console.log(`   Enable Spell Correction: ${agent.enableSpellCorrection}`);

      if (agent.supportedLanguageCodes && agent.supportedLanguageCodes.length > 0) {
        console.log(`   Supported Languages: ${agent.supportedLanguageCodes.join(', ')}`);
      }

      console.log('\n   ✅ Agent is active and configured');
      console.log('─'.repeat(80));

      return true;
    } catch (error) {
      console.log(`\n   ❌ Error getting agent: ${error.message}`);
      console.log('─'.repeat(80));
      return false;
    }
  }

  async checkFlows() {
    console.log('\n\n📊 2. FLOWS\n');
    console.log('─'.repeat(80));

    try {
      const agentPath = this.agentsClient.agentPath(
        this.projectId,
        this.location,
        this.agentId
      );

      const [flows] = await this.flowsClient.listFlows({
        parent: agentPath
      });

      if (flows.length === 0) {
        console.log('   ⚠️  No flows found! Agent needs at least a Default Start Flow.');
        console.log('─'.repeat(80));
        return false;
      }

      console.log(`   Total Flows: ${flows.length}\n`);

      flows.forEach((flow, index) => {
        console.log(`   ${index + 1}. ${flow.displayName}`);
        console.log(`      ID: ${flow.name.split('/').pop()}`);

        if (flow.transitionRoutes && flow.transitionRoutes.length > 0) {
          console.log(`      Transition Routes: ${flow.transitionRoutes.length}`);
        }

        if (flow.eventHandlers && flow.eventHandlers.length > 0) {
          console.log(`      Event Handlers: ${flow.eventHandlers.length}`);
        }
        console.log();
      });

      console.log('   ✅ Flows are configured');
      console.log('─'.repeat(80));

      return true;
    } catch (error) {
      console.log(`\n   ❌ Error getting flows: ${error.message}`);
      console.log('─'.repeat(80));
      return false;
    }
  }

  async checkIntents() {
    console.log('\n\n📊 3. INTENTS\n');
    console.log('─'.repeat(80));

    try {
      const agentPath = this.agentsClient.agentPath(
        this.projectId,
        this.location,
        this.agentId
      );

      const [intents] = await this.intentsClient.listIntents({
        parent: agentPath
      });

      if (intents.length === 0) {
        console.log('   ⚠️  No intents found! This might be why training appears stuck.');
        console.log('   💡 The agent needs intents to train the NLU model.');
        console.log('─'.repeat(80));
        return false;
      }

      console.log(`   Total Intents: ${intents.length}\n`);

      intents.forEach((intent, index) => {
        console.log(`   ${index + 1}. ${intent.displayName}`);

        if (intent.trainingPhrases && intent.trainingPhrases.length > 0) {
          console.log(`      Training Phrases: ${intent.trainingPhrases.length}`);

          // Show first 3 training phrases as examples
          const examples = intent.trainingPhrases.slice(0, 3).map(tp => {
            return tp.parts.map(p => p.text).join('');
          });

          examples.forEach(ex => {
            console.log(`         - "${ex}"`);
          });
        } else {
          console.log(`      ⚠️  No training phrases!`);
        }

        console.log();
      });

      const intentsWithPhrases = intents.filter(i =>
        i.trainingPhrases && i.trainingPhrases.length > 0
      );

      if (intentsWithPhrases.length === 0) {
        console.log('   ❌ No intents have training phrases!');
        console.log('   💡 This is likely why training appears stuck.');
        console.log('   💡 Add training phrases to intents or run setup script again.');
        console.log('─'.repeat(80));
        return false;
      }

      console.log(`   ✅ ${intentsWithPhrases.length} intents have training phrases`);
      console.log('─'.repeat(80));

      return true;
    } catch (error) {
      console.log(`\n   ❌ Error getting intents: ${error.message}`);
      console.log('─'.repeat(80));
      return false;
    }
  }

  async testIntentDetection() {
    console.log('\n\n📊 4. INTENT DETECTION TEST\n');
    console.log('─'.repeat(80));

    const testQueries = [
      'hello',
      'hi there',
      'help me find a job',
      'I need career advice'
    ];

    const sessionPath = this.sessionsClient.projectLocationAgentSessionPath(
      this.projectId,
      this.location,
      this.agentId,
      `diagnostic-${Date.now()}`
    );

    for (const query of testQueries) {
      try {
        console.log(`\n   Testing: "${query}"`);

        const request = {
          session: sessionPath,
          queryInput: {
            text: {
              text: query,
            },
            languageCode: 'en',
          },
        };

        const [response] = await this.sessionsClient.detectIntent(request);
        const queryResult = response.queryResult;

        console.log(`   ✅ Intent: ${queryResult.intent?.displayName || 'None'}`);
        console.log(`   Confidence: ${(queryResult.intentDetectionConfidence * 100).toFixed(1)}%`);

      } catch (error) {
        if (error.message.includes('NLU model') ||
            error.message.includes('does not exist') ||
            error.message.includes('not ready')) {
          console.log(`   ⏳ NLU model not ready yet - training still in progress`);
          console.log(`   💡 This is expected during training (usually 1-5 minutes)`);
        } else if (error.message.includes('No matching intent')) {
          console.log(`   ⚠️  No matching intent found (model is trained but no match)`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n─'.repeat(80));
  }
}

// Run diagnostics
if (require.main === module) {
  const diagnostics = new AgentDiagnostics();

  diagnostics.diagnose()
    .then(() => {
      console.log('\n✅ Diagnostic complete!\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Diagnostic failed:', err.message);
      process.exit(1);
    });
}

module.exports = AgentDiagnostics;
