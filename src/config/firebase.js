const admin = require('firebase-admin');

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      credential = admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    } else {
      credential = admin.credential.applicationDefault();
    }

    firebaseApp = admin.initializeApp({
      credential: credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'career-advisor-6d3b0'
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
  verifyIdToken,
  getUserByUid,
  createCustomToken,
  admin
};