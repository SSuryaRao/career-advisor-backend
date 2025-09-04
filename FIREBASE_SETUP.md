# Firebase Authentication Setup Guide

This guide will help you set up Firebase authentication for the Career Advisor backend.

## Prerequisites

1. You already have Firebase configured in your frontend (`career-advisor-6d3b0`)
2. Node.js backend with Firebase Admin SDK installed

## Step 1: Create Firebase Service Account

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `career-advisor-6d3b0`
3. Go to **Project Settings** (gear icon) → **Service accounts**
4. Click **Generate new private key**
5. Save the downloaded JSON file as `firebase-service-account.json` in the `credentials/` folder

## Step 2: Update Environment Variables

Update your `.env` file with the Firebase configuration:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://career_advisor:career1234@cluster0.qns9uj3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Server Configuration
PORT=5000
NODE_ENV=development

# API Configuration
REMOTEOK_API_URL=https://remoteok.io/api

# Security
JWT_SECRET=your-super-secret-jwt-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Firebase Configuration
FIREBASE_PROJECT_ID=career-advisor-6d3b0
FIREBASE_SERVICE_ACCOUNT_PATH=./credentials/firebase-service-account.json
```

## Step 3: Install Dependencies

```bash
cd backend2
npm install
```

## Step 4: Start the Backend

```bash
npm run dev
```

## Step 5: Test Authentication

The backend now supports the following authentication features:

### Protected Endpoints (require Firebase ID token):
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/saved-jobs` - Get saved jobs
- `POST /api/user/saved-jobs/:jobId` - Save a job
- `DELETE /api/user/saved-jobs/:jobId` - Remove saved job
- `GET /api/user/applied-jobs` - Get applied jobs
- `POST /api/user/applied-jobs/:jobId` - Mark job as applied
- `GET /api/user/activity` - Get activity log
- `DELETE /api/user/account` - Delete account

### Public Endpoints (no authentication required):
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/featured` - Get featured jobs
- `GET /api/jobs/search` - Search jobs
- `GET /api/jobs/stats` - Get job statistics
- `GET /api/jobs/:id` - Get job by ID

## How Authentication Works

1. **Frontend**: User signs in with Firebase Auth
2. **Frontend**: Gets Firebase ID token from authenticated user
3. **Frontend**: Sends API requests with `Authorization: Bearer <id-token>` header
4. **Backend**: Verifies the ID token with Firebase Admin SDK
5. **Backend**: Extracts user information and processes the request

## Frontend Integration

Your frontend `jobService` and `userService` automatically:
- Include Firebase ID tokens in API requests
- Handle authentication errors
- Sync with Firebase Auth state

## User Profile Creation

When a user makes their first authenticated request:
1. Backend verifies the Firebase token
2. If user doesn't exist in MongoDB, creates a new user profile
3. Returns the user profile data

## Error Handling

The backend returns appropriate HTTP status codes:
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Email not verified (when required)
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server errors

## Security Features

✅ **Firebase Token Verification**: All tokens verified with Firebase Admin SDK  
✅ **CORS Protection**: Configured for your frontend domain  
✅ **Rate Limiting**: Prevents API abuse  
✅ **Input Validation**: Validates all user inputs  
✅ **Secure Headers**: Helmet.js for security headers  
✅ **Error Handling**: Comprehensive error responses  

## Next Steps

1. Replace the placeholder service account key with your actual Firebase service account
2. Update CORS origins for production deployment
3. Set up proper environment variables for production
4. Test the authentication flow end-to-end

Your backend is now ready to handle authenticated users with Firebase!