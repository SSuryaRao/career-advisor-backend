# Dialogflow CX Training Instructions

## Issue
The NLU model for your Dialogflow CX agent needs to be trained. This cannot be done via API - it must be done through the Google Cloud Console.

## Solution: Train in Google Cloud Console

### Step 1: Open the Console
Visit this URL:
```
https://dialogflow.cloud.google.com/cx/projects/careercraftai-475216/locations/us-central1/agents/6a0599aa-7167-4535-aac5-c77b5817c04b
```

### Step 2: Train the Agent

1. **Login** with your Google Cloud account (the one with access to `careercraftai-475216`)

2. **Navigate to Flows**:
   - Click on "Build" in the left sidebar
   - You should see "Default Start Flow"

3. **Train the Agent**:
   - Look for a "Train" button at the top of the page
   - OR click on the **"Train Agent"** option in the settings menu (three dots)
   - Click "Train" and wait for it to complete (usually 1-2 minutes)

4. **Verify Training**:
   - Once training is complete, you should see a green checkmark or "Trained" status
   - The flow ID should no longer be `00000000-0000-0000-0000-000000000000`

### Step 3: Alternative - Test in Console First

If you can't find the Train button:

1. **Open the Test panel** on the right side of the console
2. **Type a test query** like "hello"
3. Dialogflow may **automatically train** when you first test
4. Wait for the training to complete

### Step 4: Verify Training is Complete

After training, run this command to test:

```bash
cd backend
node scripts/test-dialogflow.js
```

You should see successful responses instead of "NLU model not found" errors.

## Why This Happens

- Dialogflow CX requires manual training through the console after creating intents
- The API can create intents but cannot trigger the initial training
- This is a one-time setup - subsequent updates will auto-train

## Current Status

- ✅ Agent Created: `Career Advisor Assistant`
- ✅ 15 Intents Created with training phrases
- ✅ Default Start Flow Exists
- ⏳ **Needs Training**: Must be done in console

## Training Phrases Summary

Your agent has been configured with these intents:

1. **Default Welcome Intent** - hello, hi, help (16 phrases)
2. **features.list** - what can you do, show features (8 phrases)
3. **resume.analyze** - analyze my resume, check resume (10 phrases)
4. **job.search** - find jobs, job opportunities (11 phrases)
5. **mentor.connect** - talk to mentor, career advice (9 phrases)
6. **interview.practice** - mock interview, practice (8 phrases)
7. **roadmap.view** - show roadmap, career plan (9 phrases)
8. **roadmap.create** - create roadmap, new roadmap (7 phrases)
9. **scholarship.search** - find scholarships, funding (8 phrases)
10. **profile.view** - my profile, dashboard (7 phrases)
11. **profile.update** - update profile, edit (6 phrases)
12. **help.general** - I need help, guide me (7 phrases)
13. **feedback.positive** - thank you, great (9 phrases)
14. **goodbye** - bye, see you (7 phrases)

## After Training

Once trained, users will be able to:
- Chat with the AI assistant
- Get help navigating the platform
- Quick access to features via natural language
- Conversational interface for all platform features

## Support

If you encounter issues:
1. Ensure you're logged into the correct Google Cloud project
2. Check you have Dialogflow CX Editor/Admin permissions
3. Verify the agent exists at the URL above
4. Contact Google Cloud support if training fails repeatedly
