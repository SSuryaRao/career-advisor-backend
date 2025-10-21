/**
 * Script to create a Dialogflow CX agent for the Career Advisor chatbot
 * Run with: node scripts/create-dialogflow-agent.js
 */

require('dotenv').config();
const { AgentsClient } = require('@google-cloud/dialogflow-cx');

async function createDialogflowAgent() {
  console.log('🤖 Creating Dialogflow CX Agent...\n');

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = 'us-central1'; // Recommended location
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId) {
    console.error('❌ GOOGLE_CLOUD_PROJECT_ID not set in .env file');
    process.exit(1);
  }

  if (!credentials) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env file');
    process.exit(1);
  }

  try {
    // Initialize Agents client
    const agentsClient = new AgentsClient({
      keyFilename: credentials,
      apiEndpoint: `${location}-dialogflow.googleapis.com`
    });

    console.log('📋 Configuration:');
    console.log('  Project ID:', projectId);
    console.log('  Location:', location);
    console.log('  Credentials:', credentials);
    console.log();

    // Create agent
    const parent = `projects/${projectId}/locations/${location}`;

    const agent = {
      displayName: 'Career Advisor Assistant',
      defaultLanguageCode: 'en',
      timeZone: 'Asia/Kolkata',
      description: 'AI-powered career guidance chatbot for Career Advisor platform',
      enableStackdriverLogging: true,
      enableSpellCorrection: true,
    };

    console.log('🔨 Creating agent...');
    const [response] = await agentsClient.createAgent({
      parent: parent,
      agent: agent,
    });

    console.log('✅ Agent created successfully!');
    console.log();
    console.log('📝 Agent Details:');
    console.log('  Name:', response.name);
    console.log('  Display Name:', response.displayName);
    console.log('  Language:', response.defaultLanguageCode);
    console.log();

    // Extract agent ID from the full name
    // Format: projects/PROJECT_ID/locations/LOCATION/agents/AGENT_ID
    const agentId = response.name.split('/').pop();

    console.log('🔑 Configuration to add to .env file:');
    console.log('━'.repeat(60));
    console.log(`DIALOGFLOW_PROJECT_ID=${projectId}`);
    console.log(`DIALOGFLOW_AGENT_ID=${agentId}`);
    console.log(`DIALOGFLOW_LOCATION=${location}`);
    console.log('━'.repeat(60));
    console.log();
    console.log('📌 Next Steps:');
    console.log('  1. Add the above configuration to your backend/.env file');
    console.log('  2. Restart your backend server');
    console.log('  3. Configure intents and flows in Dialogflow CX Console:');
    console.log(`     https://dialogflow.cloud.google.com/cx/projects/${projectId}/locations/${location}/agents/${agentId}`);
    console.log();

  } catch (error) {
    if (error.code === 6) {
      console.error('❌ Agent already exists or invalid configuration');
      console.error('💡 Tip: Check if an agent already exists in the console:');
      console.error(`   https://dialogflow.cloud.google.com/cx/projects/${projectId}/locations/${location}/agents`);
    } else if (error.code === 7) {
      console.error('❌ Permission denied. Please ensure your service account has these roles:');
      console.error('   - Dialogflow API Admin');
      console.error('   - Dialogflow API Client');
    } else {
      console.error('❌ Error creating agent:', error.message);
      console.error('Error code:', error.code);
    }

    console.log();
    console.log('🔍 To check existing agents, visit:');
    console.log(`   https://dialogflow.cloud.google.com/cx/projects/${projectId}/locations/${location}/agents`);

    process.exit(1);
  }
}

createDialogflowAgent();
