# Dialogflow CX Setup Guide

## Overview

This guide will help you set up and train your Dialogflow CX agent for the CareerCraft AI chatbot.

## What Gets Configured

The setup script will create the following intents for your chatbot:

### 1. **Welcome & Help Intents**
- `Default Welcome Intent` - Greets users and shows capabilities
- `features.list` - Lists all available features
- `help.general` - Provides general help and guidance

### 2. **Feature-Specific Intents**
- `resume.analyze` - Resume analysis requests
- `job.search` - Job search and opportunities
- `mentor.connect` - Connect with AI mentors
- `interview.practice` - Mock interview practice
- `roadmap.view` - View career roadmap
- `roadmap.create` - Create new career roadmap
- `scholarship.search` - Find scholarships

### 3. **Profile Management Intents**
- `profile.view` - View user profile/dashboard
- `profile.update` - Update profile information

### 4. **Conversation Management Intents**
- `feedback.positive` - Thank you and positive feedback
- `goodbye` - End conversation

## Prerequisites

Before running the setup:

1. **Environment Variables** - Ensure your `.env` file contains:
   ```env
   DIALOGFLOW_PROJECT_ID=careercraftai-475216
   DIALOGFLOW_AGENT_ID=6a0599aa-7167-4535-aac5-c77b5817c04b
   DIALOGFLOW_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=./credentials/gcp-service-account.json
   ```

2. **Service Account Credentials** - Verify the file exists:
   ```
   E:\Coding\career-advisor\backend\credentials\gcp-service-account.json
   ```

3. **Permissions** - Your service account needs:
   - `Dialogflow API Admin` role
   - `Dialogflow CX Admin` role

## Installation & Setup

### Option 1: Using Batch File (Easiest)

Simply double-click or run:
```cmd
setup-dialogflow.bat
```

### Option 2: Manual Setup

1. **Install the Dialogflow CX package:**
   ```bash
   npm install @google-cloud/dialogflow-cx --save-dev
   ```

2. **Run the setup script:**
   ```bash
   node scripts/setup-dialogflow.js
   ```

## What Happens During Setup

The script will:

1. ✅ Connect to your Dialogflow CX agent
2. ✅ Get the Default Start Flow
3. ✅ List existing intents (if any)
4. ✅ Create 14 new intents with:
   - Training phrases (examples of user input)
   - Fulfillment responses (bot replies)
   - Proper configuration for NLU training

## Expected Output

```
🚀 Starting Dialogflow CX Agent Setup...

📍 Project: careercraftai-475216
📍 Location: us-central1
📍 Agent ID: 6a0599aa-7167-4535-aac5-c77b5817c04b

📌 Step 1: Getting Default Start Flow...
✅ Found Default Start Flow: projects/.../flows/00000000-0000-0000-0000-000000000000

📌 Step 2: Checking existing intents...
📋 Found 0 existing intents

📌 Step 3: Creating intents...
✅ Created intent: Default Welcome Intent
✅ Created intent: features.list
✅ Created intent: resume.analyze
...

✅ Dialogflow CX Agent Setup Complete!

📝 Summary:
   - Created 14 intents
   - Training phrases added for each intent
   - Fulfillment responses configured

🎯 Next Steps:
   1. Test your agent in the Dialogflow CX console
   2. Try sending "hello" to your chatbot
   3. Verify all intents are working correctly
```

## Testing Your Agent

### 1. Test in Dialogflow Console

Visit: https://dialogflow.cloud.google.com/cx/projects/careercraftai-475216/locations/us-central1/agents/6a0599aa-7167-4535-aac5-c77b5817c04b

Try these test phrases:
- "hello" → Should trigger Welcome Intent
- "find jobs" → Should trigger job.search intent
- "analyze my resume" → Should trigger resume.analyze intent
- "what can you do" → Should trigger features.list intent

### 2. Test via Your Backend

```bash
# Start your backend
npm run dev

# In another terminal or Postman, send:
POST http://localhost:5000/api/chatbot/message
Content-Type: application/json

{
  "message": "hello",
  "sessionId": "test-session-123",
  "language": "en"
}
```

### 3. Test via Frontend

1. Start your frontend: `cd frontend && npm run dev`
2. Open http://localhost:3000
3. Use the chatbot interface
4. Type "hello" or any other test phrase

## Intent Training Phrases Reference

Here are examples of what users can say for each intent:

| Intent | Example Phrases |
|--------|----------------|
| **Default Welcome Intent** | "hello", "hi", "help", "what can you do" |
| **features.list** | "show features", "what can you do", "list options" |
| **resume.analyze** | "analyze resume", "check my cv", "ats score" |
| **job.search** | "find jobs", "search jobs", "job opportunities" |
| **mentor.connect** | "talk to mentor", "career advice", "need guidance" |
| **interview.practice** | "practice interview", "mock interview", "prepare interview" |
| **roadmap.view** | "show roadmap", "career path", "my learning plan" |
| **roadmap.create** | "create roadmap", "generate path", "plan career" |
| **scholarship.search** | "find scholarships", "funding", "financial aid" |
| **profile.view** | "my profile", "view profile", "dashboard" |
| **profile.update** | "update profile", "edit profile", "change settings" |
| **help.general** | "I need help", "how does this work", "guide me" |
| **feedback.positive** | "thank you", "thanks", "helpful", "great" |
| **goodbye** | "bye", "goodbye", "see you later" |

## Troubleshooting

### Error: "NLU model for flow does not exist"

This is the error you were experiencing. Running this setup script will fix it by creating all the necessary intents.

### Error: "Permission denied"

Ensure your service account has these roles:
- Dialogflow API Admin
- Dialogflow CX Admin

### Error: "Agent not found"

Verify the agent exists:
```bash
gcloud auth list
# Should show: saytosubhamkumar@gmail.com

# Visit the console to verify agent:
https://dialogflow.cloud.google.com/cx/projects/careercraftai-475216/locations/us-central1/agents
```

### Error: "Already exists"

The script will skip intents that already exist. This is normal if you run the script multiple times.

### Rate Limiting

The script includes a 500ms delay between creating intents to avoid rate limiting. If you still hit rate limits, you can increase this delay in the script.

## Adding New Intents

To add a new intent in the future:

1. Open `scripts/setup-dialogflow.js`
2. Add a new intent to the `getIntentsConfig()` method:

```javascript
{
  displayName: 'your.intent.name',
  trainingPhrases: [
    'user phrase 1',
    'user phrase 2',
    'user phrase 3'
  ],
  responses: [
    'Bot response option 1',
    'Bot response option 2'
  ]
}
```

3. Run the setup script again
4. Update `chatbotController.js` to handle the new intent in `handleIntentActions()`

## Backend Integration

The intents are already integrated in your backend at:
`backend/src/controllers/chatbotController.js`

The `handleIntentActions()` method maps each intent to specific actions:
- Redirects to appropriate pages
- Opens modals
- Provides data to the frontend

## Support

If you encounter issues:

1. Check the error message carefully
2. Verify all environment variables are set
3. Ensure credentials file exists and is valid
4. Check service account permissions
5. View logs in the Dialogflow Console

## Next Steps After Setup

1. ✅ Train additional phrases in the Dialogflow Console
2. ✅ Add custom entities (e.g., job titles, skills)
3. ✅ Create conversational flows with pages
4. ✅ Add webhook fulfillment for dynamic responses
5. ✅ Enable multilingual support (Hindi, Tamil, etc.)
6. ✅ Set up analytics and monitoring

---

**Created:** 2025-10-19
**Last Updated:** 2025-10-19
**Agent URL:** https://dialogflow.cloud.google.com/cx/projects/careercraftai-475216/locations/us-central1/agents/6a0599aa-7167-4535-aac5-c77b5817c04b
