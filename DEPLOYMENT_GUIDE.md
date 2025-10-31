# Google App Engine Deployment Guide

## Overview
This guide explains how to deploy the Career Advisor backend to Google App Engine with Document AI and other GCP services properly configured.

## Problem Fixed
Previously, Document AI was not working in production because `GOOGLE_APPLICATION_CREDENTIALS` was not set. The error was:
```
⚠️ GOOGLE_APPLICATION_CREDENTIALS not set. Document AI will be disabled.
```

## Solution
The application now uses **Application Default Credentials (ADC)** in production, which automatically authenticates using the service account attached to the App Engine instance.

## Prerequisites

1. **Google Cloud SDK** installed and configured
   ```bash
   gcloud --version
   ```

2. **Service Account** with proper permissions:
   - Document AI User
   - Vertex AI User
   - Storage Admin (for GCS bucket)
   - Dialogflow API Client
   - Speech-to-Text User

## Step 1: Grant IAM Permissions to App Engine Service Account

Run these commands to grant the necessary permissions:

```bash
# Set your project ID
export PROJECT_ID="careercraftai-475216"

# Get the default App Engine service account
export SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant Document AI permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/documentai.apiUser"

# Grant Vertex AI permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/aiplatform.user"

# Grant Cloud Storage permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.admin"

# Grant Dialogflow permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/dialogflow.client"

# Grant Speech-to-Text permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/speech.client"
```

### Alternative: Use Custom Service Account

If you prefer to use the custom service account instead:

```bash
# Use the existing service account
export CUSTOM_SA="careercraft-ai@careercraftai-475216.iam.gserviceaccount.com"

# Grant permissions (same as above but for custom SA)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CUSTOM_SA}" \
  --role="roles/documentai.apiUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CUSTOM_SA}" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CUSTOM_SA}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CUSTOM_SA}" \
  --role="roles/dialogflow.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CUSTOM_SA}" \
  --role="roles/speech.client"
```

## Step 2: Set Environment Variables (if needed)

All environment variables are already configured in `app.yaml`. You can verify them:

```yaml
env_variables:
  GOOGLE_CLOUD_PROJECT_ID: "careercraftai-475216"
  DOCUMENT_AI_PROCESSOR_ID: "69cd65f133ed1456"
  DOCUMENT_AI_LOCATION: "us"
  VERTEX_AI_LOCATION: "us-central1"
  VERTEX_AI_MODEL: "gemini-2.5-pro"
  GCS_BUCKET_NAME: "career-advisor-interview-temp"
  DIALOGFLOW_PROJECT_ID: "careercraftai-475216"
  DIALOGFLOW_AGENT_ID: "6a0599aa-7167-4535-aac5-c77b5817c04b"
  DIALOGFLOW_LOCATION: "us-central1"
```

**IMPORTANT:** Do NOT add database credentials (MongoDB), JWT secrets, or API keys to `app.yaml` if it's committed to version control. Use Google Secret Manager instead.

## Step 3: Deploy to App Engine

### Option A: Deploy with Default Service Account
```bash
cd backend
gcloud app deploy
```

### Option B: Deploy with Custom Service Account
```bash
cd backend
gcloud app deploy --service-account=careercraft-ai@careercraftai-475216.iam.gserviceaccount.com
```

## Step 4: Verify Deployment

After deployment completes:

1. **Check the logs:**
   ```bash
   gcloud app logs tail -s default
   ```

2. **Look for these success messages:**
   ```
   ✅ Document AI client initialized with Application Default Credentials
   ✅ Vertex AI initialized successfully
   ✅ Cloud Storage initialized successfully
   ✅ Speech-to-Text v1 API initialized successfully
   ✅ Dialogflow CX initialized successfully
   ```

3. **Test Document AI endpoint:**
   ```bash
   curl -X POST https://your-app-url.appspot.com/api/resume/upload \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "resume=@path/to/test-resume.pdf"
   ```

## Step 5: Monitor and Troubleshoot

### View Logs
```bash
# Tail logs in real-time
gcloud app logs tail

# View logs from last hour
gcloud app logs read --limit=50
```

### Check Service Account Permissions
```bash
# List IAM policy for the project
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}"
```

### Common Issues

#### 1. "Permission denied" errors
**Solution:** Ensure the service account has all required IAM roles (see Step 1)

#### 2. "Document AI processor not found"
**Solution:** Verify the processor ID and location are correct in app.yaml

#### 3. "Service account not found"
**Solution:** The custom service account must exist. Check with:
```bash
gcloud iam service-accounts list
```

## Architecture Changes

### Before (Local Development)
- Used `GOOGLE_APPLICATION_CREDENTIALS` pointing to JSON key file
- Required manual credential file management
- Credentials file included in deployment (security risk)

### After (Production)
- Uses Application Default Credentials (ADC)
- Automatically uses App Engine service account
- No credential files in deployment
- More secure and follows Google Cloud best practices

## Security Best Practices

1. **Never commit credentials to Git:**
   - `.gcloudignore` prevents credential files from being deployed
   - Use Secret Manager for sensitive environment variables

2. **Use principle of least privilege:**
   - Only grant necessary IAM roles
   - Use custom service accounts with specific permissions

3. **Rotate credentials regularly:**
   - Service account keys should be rotated every 90 days
   - ADC uses short-lived tokens automatically

4. **Monitor API usage:**
   - Set up budget alerts in Google Cloud Console
   - Monitor Document AI usage (1,000 pages/month free tier)

## Cost Optimization

- **Document AI:** First 1,000 pages per month free
- **Vertex AI:** Pay per token (use appropriate model)
- **App Engine:** F2 instances auto-scale (min: 1, max: 10)
- **Cloud Storage:** Lifecycle policy deletes files after 1 hour

## Support

If you encounter issues:
1. Check logs: `gcloud app logs tail`
2. Verify IAM permissions
3. Test locally first with service account key
4. Contact Google Cloud Support if needed

## Local Development

For local development, keep using the `.env` file with:
```
GOOGLE_APPLICATION_CREDENTIALS=./credentials/gcp-service-account.json
```

The application automatically detects the environment and uses:
- **keyFilename** for local development
- **Application Default Credentials** for production
