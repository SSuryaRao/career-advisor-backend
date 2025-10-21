# How to Check Dialogflow Training Status

There are **4 methods** to check if your Dialogflow CX agent training is complete:

---

## Method 1: Quick Status Check Script (Fastest) ⚡

### Single Check

Run this command to check the current status:

```bash
node scripts/check-training-status.js
```

**Possible Outputs:**

### ✅ If Training is Complete:
```
✅ SUCCESS! Training is COMPLETE!

📊 Test Results:
────────────────────────────────────────────────────────────────────────────────
   Intent Detected: Default Welcome Intent
   Confidence: 100.0%
   Response Preview: Hello! I'm your AI Career Assistant...
────────────────────────────────────────────────────────────────────────────────

🎉 Your Dialogflow agent is ready to use!
```

### ⏳ If Training is Still in Progress:
```
⏳ TRAINING IN PROGRESS

📊 Status:
────────────────────────────────────────────────────────────────────────────────
   ⏰ The NLU model is still training
   ⏳ This usually takes 1-5 minutes
   🔄 Training happens automatically in the background
────────────────────────────────────────────────────────────────────────────────

💡 What to do:
   1. Wait a few more minutes
   2. Run this script again: node scripts/check-training-status.js
   3. Or check the Dialogflow Console
```

---

### Auto-Wait Mode (Automatic Checking)

This will automatically check every 30 seconds until training completes:

```bash
node scripts/check-training-status.js --wait
```

This mode will:
- Check every 30 seconds
- Wait up to 10 minutes
- Automatically notify you when training is complete

---

## Method 2: Check in Dialogflow Console (Visual) 🌐

### Step-by-Step:

1. **Open the Dialogflow Console:**

   Click this link or copy-paste into your browser:
   ```
   https://dialogflow.cloud.google.com/cx/projects/careercraftai-475216/locations/us-central1/agents/6a0599aa-7167-4535-aac5-c77b5817c04b
   ```

2. **Use the Test Agent Panel:**

   - Look for the **"Test Agent"** panel on the **right side** of the screen
   - If it's not visible, click the **"Test Agent"** button in the top-right corner

3. **Type a Test Query:**

   - In the test panel, type: `hello`
   - Press **Enter**

4. **Check the Results:**

   **✅ Training is Complete if:**
   - You see a response like: "Hello! I'm your AI Career Assistant..."
   - Intent shows: "Default Welcome Intent"
   - No error messages appear

   **⏳ Training in Progress if:**
   - You see an error: "NLU model does not exist"
   - Or any training-related error message
   - Wait 2-3 minutes and try again

### Visual Guide:

```
┌─────────────────────────────────────────────────────────────┐
│  Dialogflow CX Console                                      │
├─────────────────────────────────────────────────────────────┤
│                                              ┌──────────────┐│
│  Left Sidebar:                               │ Test Agent   ││
│  ├─ Default Start Flow                       ├──────────────┤│
│  ├─ Intents (14)                             │              ││
│  └─ Manage                                   │ Type here... ││
│                                              │              ││
│                                              │ > hello      ││
│                                              │              ││
│  Main Area:                                  │ ✅ Intent:   ││
│  - Flow configuration                        │ Default      ││
│  - Pages and routes                          │ Welcome      ││
│                                              │ Intent       ││
│                                              │              ││
│                                              │ Response:    ││
│                                              │ Hello! I'm...││
│                                              └──────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Method 3: Check via Backend API 🔧

### Step 1: Start Your Backend

```bash
cd E:\Coding\career-advisor\backend
npm run dev
```

Wait for:
```
🚀 Server running on port 5000
✅ Dialogflow CX initialized successfully
```

### Step 2: Test with cURL (Command Line)

Open a **new terminal** and run:

```bash
curl -X POST http://localhost:5000/api/chatbot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"hello\", \"sessionId\": \"test-session\"}"
```

**Note:** On Windows CMD, use `^` for line continuation. On PowerShell or Git Bash, use `` ` ``.

**PowerShell version:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/chatbot/message" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"message": "hello", "sessionId": "test-session"}'
```

### Step 3: Check the Response

**✅ Training is Complete if you see:**
```json
{
  "success": true,
  "data": {
    "response": "Hello! I'm your AI Career Assistant...",
    "intent": "Default Welcome Intent",
    "confidence": 1.0
  }
}
```

**⏳ Training in Progress if you see:**
```json
{
  "success": true,
  "data": {
    "response": "I'm having trouble right now. Here are some quick links...",
    "intent": "Fallback",
    "error": "NLU model for flow does not exist"
  }
}
```

---

## Method 4: Check via Postman or Insomnia (API Testing Tool) 📮

### Setup:

1. **Open Postman/Insomnia**
2. **Create a new POST request**
3. **Set the URL:**
   ```
   http://localhost:5000/api/chatbot/message
   ```

4. **Set Headers:**
   ```
   Content-Type: application/json
   ```

5. **Set Body (JSON):**
   ```json
   {
     "message": "hello",
     "sessionId": "test-session-123"
   }
   ```

6. **Click Send**

### Check Response:

- **Success Response** = Training Complete ✅
- **Fallback Response** = Training in Progress ⏳

---

## Method 5: Check in Your Frontend (Browser) 🌐

If you have the frontend running:

### Step 1: Start Frontend

```bash
cd E:\Coding\career-advisor\frontend
npm run dev
```

### Step 2: Open Browser

Navigate to:
```
http://localhost:3000
```

### Step 3: Use the Chatbot

1. Find the chatbot widget on the page
2. Type: `hello`
3. Press Enter

**✅ Training Complete:**
- You get a proper response about career assistance

**⏳ Training in Progress:**
- You get a fallback message with quick links

---

## Troubleshooting Training Issues

### If Training Takes Longer Than 10 Minutes:

1. **Check the Dialogflow Console Manually:**
   - Go to the console URL (Method 2)
   - Click on "Manage" → "Intents"
   - Look for any warnings or errors

2. **Check for Training Status Indicator:**
   - Some versions show a training status badge
   - Look for: "Training in progress", "Training complete", etc.

3. **Manually Trigger Training (if needed):**

   Go to the console and:
   - Click on any intent
   - Add a dummy training phrase (e.g., "test phrase")
   - Save the intent
   - Remove the dummy phrase
   - Save again
   - This forces a re-training

4. **Verify Permissions:**
   ```bash
   # Check your service account has correct roles
   gcloud projects get-iam-policy careercraftai-475216 \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:*"
   ```

5. **Check Dialogflow Logs:**
   - In the console, go to "Logs"
   - Look for any training-related errors

---

## Expected Timeline

| Time Elapsed | Status | What to Do |
|--------------|--------|------------|
| 0-2 minutes | ⏳ Training starting | Wait, be patient |
| 2-5 minutes | ⏳ Training in progress | Normal, keep waiting |
| 5-10 minutes | ⏳ Still training | Check console manually |
| 10+ minutes | ⚠️ May have issue | Check troubleshooting above |

---

## Quick Command Reference

```bash
# Quick status check (run from backend folder)
node scripts/check-training-status.js

# Auto-wait mode (checks every 30s)
node scripts/check-training-status.js --wait

# Full test suite
node scripts/test-dialogflow.js

# Start backend for API testing
npm run dev
```

---

## What Success Looks Like

When training is complete, you should see:

### ✅ In Status Check Script:
```
✅ SUCCESS! Training is COMPLETE!
Intent Detected: Default Welcome Intent
Confidence: 100.0%
```

### ✅ In Console Test Panel:
```
Intent: Default Welcome Intent
Response: Hello! I'm your AI Career Assistant...
```

### ✅ In Backend Logs:
```
🎯 Intent detected: Default Welcome Intent
📊 Confidence: 1
```

### ✅ No Errors Like:
- ❌ "NLU model does not exist"
- ❌ "Please try again after retraining"
- ❌ "Training in progress"

---

## Summary: Fastest Way to Check

**Run this command every 2 minutes:**

```bash
node scripts/check-training-status.js
```

**Or use auto-wait mode (recommended):**

```bash
node scripts/check-training-status.js --wait
```

This will automatically check and notify you when training is complete!

---

**Created:** 2025-10-19
**Last Updated:** 2025-10-19
