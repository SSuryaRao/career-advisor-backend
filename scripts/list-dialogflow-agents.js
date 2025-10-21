/**
 * Script to list existing Dialogflow CX agents
 * Run with: node scripts/list-dialogflow-agents.js
 */

require('dotenv').config();
const { AgentsClient } = require('@google-cloud/dialogflow-cx');

async function listDialogflowAgents() {
  console.log('🔍 Listing Dialogflow CX Agents...\n');

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = 'us-central1'; // Check this location
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId || !credentials) {
    console.error('❌ Missing configuration in .env file');
    process.exit(1);
  }

  try {
    const agentsClient = new AgentsClient({
      keyFilename: credentials,
      apiEndpoint: `${location}-dialogflow.googleapis.com`
    });

    console.log('📋 Configuration:');
    console.log('  Project ID:', projectId);
    console.log('  Location:', location);
    console.log();

    const parent = `projects/${projectId}/locations/${location}`;

    console.log('🔎 Searching for agents...\n');
    const [agents] = await agentsClient.listAgents({ parent });

    if (agents.length === 0) {
      console.log('❌ No agents found in this location.');
      console.log();
      console.log('💡 Try checking other locations:');
      console.log('   - global');
      console.log('   - us-central1');
      console.log('   - europe-west1');
      console.log('   - asia-northeast1');
      console.log();
      console.log('🔧 To create a new agent, run:');
      console.log('   node scripts/create-dialogflow-agent.js');
      console.log();
      console.log('🌐 Or visit the console:');
      console.log(`   https://dialogflow.cloud.google.com/cx/projects/${projectId}/locations/${location}/agents`);
    } else {
      console.log(`✅ Found ${agents.length} agent(s):\n`);

      agents.forEach((agent, index) => {
        const agentId = agent.name.split('/').pop();
        console.log(`${index + 1}. ${agent.displayName}`);
        console.log(`   Agent ID: ${agentId}`);
        console.log(`   Full Name: ${agent.name}`);
        console.log(`   Language: ${agent.defaultLanguageCode}`);
        console.log(`   Time Zone: ${agent.timeZone}`);
        console.log();

        console.log('   🔑 Add to .env:');
        console.log(`   DIALOGFLOW_PROJECT_ID=${projectId}`);
        console.log(`   DIALOGFLOW_AGENT_ID=${agentId}`);
        console.log(`   DIALOGFLOW_LOCATION=${location}`);
        console.log();
        console.log('   🌐 Console URL:');
        console.log(`   https://dialogflow.cloud.google.com/cx/projects/${projectId}/locations/${location}/agents/${agentId}`);
        console.log();
      });
    }

  } catch (error) {
    console.error('❌ Error listing agents:', error.message);
    if (error.code === 7) {
      console.error('💡 Permission denied. Ensure service account has Dialogflow API Client role');
    }
    process.exit(1);
  }
}

listDialogflowAgents();
