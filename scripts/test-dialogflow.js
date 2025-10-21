/**
 * Dialogflow CX Agent Test Script
 *
 * Tests the trained agent with sample queries
 *
 * Run: node scripts/test-dialogflow.js
 */

const { SessionsClient } = require('@google-cloud/dialogflow-cx');
require('dotenv').config();

class DialogflowTester {
  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID;
    this.location = process.env.DIALOGFLOW_LOCATION || 'us-central1';
    this.agentId = process.env.DIALOGFLOW_AGENT_ID;
    this.credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    this.sessionsClient = new SessionsClient({
      keyFilename: this.credentials,
      apiEndpoint: `${this.location}-dialogflow.googleapis.com`
    });

    this.sessionId = `test-session-${Date.now()}`;
  }

  async detectIntent(queryText) {
    const sessionPath = this.sessionsClient.projectLocationAgentSessionPath(
      this.projectId,
      this.location,
      this.agentId,
      this.sessionId
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: queryText,
        },
        languageCode: 'en',
      },
    };

    try {
      const [response] = await this.sessionsClient.detectIntent(request);
      const queryResult = response.queryResult;

      return {
        query: queryText,
        intent: queryResult.intent?.displayName || 'No intent detected',
        confidence: queryResult.intentDetectionConfidence,
        response: queryResult.responseMessages
          .filter(msg => msg.text)
          .map(msg => msg.text.text[0])
          .join(' ') || 'No response',
        parameters: queryResult.parameters
      };
    } catch (error) {
      return {
        query: queryText,
        error: error.message
      };
    }
  }

  async runTests() {
    console.log('\n🧪 Testing Dialogflow CX Agent...\n');
    console.log(`📍 Session ID: ${this.sessionId}\n`);

    const testQueries = [
      'hello',
      'what can you do',
      'analyze my resume',
      'find jobs',
      'talk to mentor',
      'practice interview',
      'show roadmap',
      'find scholarships',
      'my profile',
      'thank you',
      'bye'
    ];

    console.log(`Running ${testQueries.length} test queries...\n`);
    console.log('='.repeat(80) + '\n');

    for (const query of testQueries) {
      const result = await this.detectIntent(query);

      if (result.error) {
        console.log(`❌ Query: "${result.query}"`);
        console.log(`   Error: ${result.error}\n`);
      } else {
        console.log(`✅ Query: "${result.query}"`);
        console.log(`   Intent: ${result.intent}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Response: ${result.response.substring(0, 100)}...`);
        console.log('');
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('='.repeat(80));
    console.log('\n✅ Testing Complete!\n');
  }
}

// Run tests
if (require.main === module) {
  const tester = new DialogflowTester();
  tester.runTests().catch(console.error);
}

module.exports = DialogflowTester;
