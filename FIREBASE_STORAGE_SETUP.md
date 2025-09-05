# Firebase Storage Setup Guide

## Current Status
The system is configured with **hybrid storage** - it will attempt to use Firebase Storage first, and fallback to local storage if Firebase is not properly configured.

## Firebase Storage Configuration (Recommended)

### Step 1: Get Real Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `career-advisor-6d3b0`
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file

### Step 2: Replace Placeholder Credentials

Replace the content of `credentials/firebase-service-account.json` with the real credentials from Step 1.

**Current file contains placeholder values:**
- `client_email` contains "xxxxx"
- These need to be replaced with real values

### Step 3: Configure Storage Bucket

1. In Firebase Console, go to Storage
2. Create a storage bucket if not exists
3. Set up security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /resumes/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 4: Update Environment Variables

The `.env` file already contains the required variables:
```
FIREBASE_PROJECT_ID=career-advisor-6d3b0
FIREBASE_STORAGE_BUCKET=career-advisor-6d3b0.appspot.com
FIREBASE_SERVICE_ACCOUNT_PATH=./credentials/firebase-service-account.json
```

## Current Fallback Behavior

Since Firebase credentials are not valid, the system will:

1. ✅ **Try Firebase Storage** - Will fail with current credentials
2. ✅ **Fallback to Local Storage** - Saves files to `Backend2/uploads/resumes/`
3. ✅ **Continue working** - Resume analysis will work normally

## Files are stored as:
- **Firebase**: `resumes/{userId}/{uuid}-{originalName}.pdf`
- **Local**: `uploads/resumes/{uuid}-{originalName}.pdf`

## Migration

Once Firebase is properly configured, you can migrate existing local files:

```bash
cd Backend2
node src/scripts/migrateToFirebaseStorage.js
```

## Benefits of Firebase Storage:
- ☁️ Cloud storage (no server disk usage)
- 🔒 Better security with signed URLs
- 📈 Auto-scaling and CDN distribution
- 💾 Automatic backups
- 🌍 Global availability

## Testing Firebase Connection

The system will log the storage type used:
- `✅ Uploaded to Firebase Storage` - Firebase working
- `⚠️ Firebase Storage failed, using local storage` - Using fallback