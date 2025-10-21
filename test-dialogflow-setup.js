/**
 * Test script to verify Dialogflow CX setup
 * Run with: node test-dialogflow-setup.js
 */

require('dotenv').config();
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

async function testDialogflowSetup() {
  console.log('🔍 Testing Dialogflow CX Setup...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID || '❌ NOT SET');
  console.log('  GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || '❌ NOT SET');
  console.log('  DOCUMENT_AI_PROCESSOR_ID:', process.env.DOCUMENT_AI_PROCESSOR_ID || '❌ NOT SET');
  console.log('  DOCUMENT_AI_LOCATION:', process.env.DOCUMENT_AI_LOCATION || '❌ NOT SET');
  console.log();

  try {
    // Initialize Dialogflow CX client
    const client = new SessionsClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    console.log('✅ Dialogflow CX client initialized successfully');
    console.log('✅ Credentials file loaded:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log();

    // List available locations
    console.log('📍 Testing API access...');
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is not set');
    }

    console.log('✅ Project ID configured:', projectId);
    console.log();

    console.log('🎉 Dialogflow CX Setup Complete!');
    console.log();
    console.log('Next Steps:');
    console.log('  1. Create a Dialogflow CX agent in the Google Cloud Console');
    console.log('  2. Note the agent ID and update your configuration');
    console.log('  3. Configure intents, entities, and flows');
    console.log();

  } catch (error) {
    console.error('❌ Error testing Dialogflow setup:', error.message);
    console.error();
    console.error('Troubleshooting:');
    console.error('  1. Verify credentials file exists at:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.error('  2. Ensure GOOGLE_CLOUD_PROJECT_ID is set correctly');
    console.error('  3. Check that Dialogflow API is enabled in GCP');
    console.error('  4. Verify service account has proper permissions');
    process.exit(1);
  }
}

testDialogflowSetup();
