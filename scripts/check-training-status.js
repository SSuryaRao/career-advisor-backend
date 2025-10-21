/**
 * Check Dialogflow CX Training Status
 *
 * This script checks if the NLU model training is complete
 * by attempting to detect a simple intent.
 *
 * Run: node scripts/check-training-status.js
 */

const { SessionsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class TrainingStatusChecker {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    this.sessionsClient = new SessionsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });
  }

  async checkStatus() {
    console.log('\n🔍 Checking Dialogflow CX Training Status...\n');
    console.log(`📍 Project: ${this.projectId}`);
    console.log(`📍 Location: ${this.location}`);
    console.log(`📍 Agent ID: ${this.agentId}\n`);
    console.log('='.repeat(80));

    const sessionPath = this.sessionsClient.projectLocationAgentSessionPath(
      this.projectId,
      this.location,
      this.agentId,
      `status-check-${Date.now()}`
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: 'hello',
        },
        languageCode: 'en',
      },
    };

    try {
      console.log('\n🧪 Testing with query: "hello"\n');

      const [response] = await this.sessionsClient.detectIntent(request);
      const queryResult = response.queryResult;

      console.log('✅ SUCCESS! Training is COMPLETE!\n');
      console.log('📊 Test Results:');
      console.log('─'.repeat(80));
      console.log(`   Intent Detected: ${queryResult.intent?.displayName || 'None'}`);
      console.log(`   Confidence: ${(queryResult.intentDetectionConfidence * 100).toFixed(1)}%`);

      const botResponse = queryResult.responseMessages
        .filter(msg => msg.text)
        .map(msg => msg.text.text[0])
        .join(' ');

      console.log(`   Response Preview: ${botResponse.substring(0, 100)}...`);
      console.log('─'.repeat(80));
      console.log('\n🎉 Your Dialogflow agent is ready to use!\n');
      console.log('✅ Next steps:');
      console.log('   1. Test with more queries: node scripts/test-dialogflow.js');
      console.log('   2. Start your backend: npm run dev');
      console.log('   3. Test via your frontend chatbot\n');
      console.log('='.repeat(80));

      return true;

    } catch (error) {
      if (error.message.includes('NLU model') || error.message.includes('does not exist')) {
        console.log('⏳ TRAINING IN PROGRESS\n');
        console.log('📊 Status:');
        console.log('─'.repeat(80));
        console.log('   ⏰ The NLU model is still training');
        console.log('   ⏳ This usually takes 1-5 minutes');
        console.log('   🔄 Training happens automatically in the background');
        console.log('─'.repeat(80));
        console.log('\n💡 What to do:');
        console.log('   1. Wait a few more minutes');
        console.log('   2. Run this script again: node scripts/check-training-status.js');
        console.log('   3. Or check the Dialogflow Console (see below)\n');
        console.log('🌐 Console URL:');
        console.log(`   https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}\n`);
        console.log('='.repeat(80));

        return false;
      } else {
        console.log('❌ ERROR\n');
        console.log('📊 Details:');
        console.log('─'.repeat(80));
        console.log(`   Error: ${error.message}`);
        console.log('─'.repeat(80));
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Verify your credentials are correct');
        console.log('   2. Check your .env file has all required variables');
        console.log('   3. Ensure the agent exists in the Console');
        console.log('   4. Check the Console for more details:\n');
        console.log(`   https://dialogflow.cloud.google.com/cx/projects/${this.projectId}/locations/${this.location}/agents/${this.agentId}\n`);
        console.log('='.repeat(80));

        throw error;
      }
    }
  }

  async waitForTraining(maxWaitMinutes = 10, checkIntervalSeconds = 30) {
    console.log('\n⏰ Waiting for training to complete...\n');
    console.log(`   Max wait time: ${maxWaitMinutes} minutes`);
    console.log(`   Check interval: ${checkIntervalSeconds} seconds\n`);

    const maxAttempts = (maxWaitMinutes * 60) / checkIntervalSeconds;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;

      console.log(`\n🔄 Attempt ${attempt}/${maxAttempts} (${attempt * checkIntervalSeconds}s elapsed)`);

      const isReady = await this.checkStatus();

      if (isReady) {
        return true;
      }

      if (attempt < maxAttempts) {
        console.log(`\n⏳ Waiting ${checkIntervalSeconds} seconds before next check...\n`);
        await new Promise(resolve => setTimeout(resolve, checkIntervalSeconds * 1000));
      }
    }

    console.log('\n⚠️  Training is taking longer than expected.');
    console.log('    Please check the Dialogflow Console manually.\n');
    return false;
  }
}

// Run the check
if (require.main === module) {
  const checker = new TrainingStatusChecker();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--wait')) {
    // Wait mode: keep checking until training completes
    checker.waitForTraining(10, 30).catch(err => {
      console.error('\n❌ Error:', err.message);
      process.exit(1);
    });
  } else {
    // Single check mode
    checker.checkStatus().catch(err => {
      if (!err.message.includes('NLU model')) {
        console.error('\n❌ Error:', err.message);
        process.exit(1);
      }
    });
  }
}

module.exports = TrainingStatusChecker;
