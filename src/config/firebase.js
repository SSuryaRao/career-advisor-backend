const admin = require('firebase-admin');

let firebaseApp;

const validateFirebaseCredentials = (serviceAccount) => {
  if (!serviceAccount || typeof serviceAccount !== 'object') {
    throw new Error('Invalid service account format');
  }
  
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  for (const field of requiredFields) {
    if (!serviceAccount[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Check for placeholder values
  if (serviceAccount.client_email.includes('xxxxx') || 
      serviceAccount.private_key.includes('placeholder') ||
      serviceAccount.client_email.includes('placeholder')) {
    throw new Error('Service account contains placeholder values. Please provide valid Firebase credentials.');
  }
  
  return true;
};

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    let credential;
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      validateFirebaseCredentials(serviceAccount);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        
        // Check if file exists before requiring it
        if (!fs.existsSync(serviceAccountPath)) {
          throw new Error(`Service account file not found at: ${serviceAccountPath}`);
        }
        
        serviceAccount = require(serviceAccountPath);
        validateFirebaseCredentials(serviceAccount);
        credential = admin.credential.cert(serviceAccount);
      } catch (error) {
        throw new Error(`Failed to load service account from path: ${error.message}`);
      }
    } else {
      // Try to load from default local path as fallback
      const path = require('path');
      const fs = require('fs');
      const defaultPath = path.join(__dirname, '../../credentials/firebase-service-account.json');
      
      if (fs.existsSync(defaultPath)) {
        try {
          serviceAccount = require(defaultPath);
          validateFirebaseCredentials(serviceAccount);
          credential = admin.credential.cert(serviceAccount);
          console.log('✅ Using local Firebase service account file');
        } catch (error) {
          console.log('⚠️ Local service account file exists but failed to load, using application default credentials');
          credential = admin.credential.applicationDefault();
        }
      } else {
        console.log('⚠️ Using application default credentials');
        credential = admin.credential.applicationDefault();
      }
    }

    firebaseApp = admin.initializeApp({
      credential: credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'career-advisor-6d3b0',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'career-advisor-6d3b0.firebasestorage.app'
    });

    console.log('✅ Firebase Admin initialized successfully');
    return firebaseApp;

  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
};

const getFirebaseAuth = () => {
  const app = initializeFirebase();
  return app.auth();
};

const getFirebaseStorage = () => {
  const app = initializeFirebase();
  return app.storage();
};

const verifyIdToken = async (idToken) => {
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    throw error;
  }
};

const getUserByUid = async (uid) => {
  try {
    const auth = getFirebaseAuth();
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('❌ Get user failed:', error.message);
    throw error;
  }
};

const createCustomToken = async (uid, additionalClaims = {}) => {
  try {
    const auth = getFirebaseAuth();
    const customToken = await auth.createCustomToken(uid, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('❌ Create custom token failed:', error.message);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  getFirebaseAuth,
  getFirebaseStorage,
  verifyIdToken,
  getUserByUid,
  createCustomToken,
  admin
};