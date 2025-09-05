const { getFirebaseStorage } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class FirebaseStorageService {
  constructor() {
    try {
      this.storage = getFirebaseStorage();
      this.bucket = this.storage.bucket();
    } catch (error) {
      console.error('❌ Firebase Storage initialization failed:', error.message);
      throw new Error('Firebase Storage not properly configured. Please check your service account credentials.');
    }
  }

  async uploadResume(fileBuffer, originalName, userId) {
    try {
      const uniqueFileName = `${uuidv4()}-${originalName}`;
      const storagePath = `resumes/${userId}/${uniqueFileName}`;
      const file = this.bucket.file(storagePath);

      const stream = file.createWriteStream({
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            originalName: originalName,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString()
          }
        },
        resumable: false
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('Firebase Storage upload error:', error);
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            await file.makePublic();
            
            const downloadURL = `https://storage.googleapis.com/${this.bucket.name}/${storagePath}`;
            
            resolve({
              firebaseUrl: downloadURL,
              firebaseStoragePath: storagePath,
              filename: uniqueFileName
            });
          } catch (error) {
            console.error('Error making file public:', error);
            reject(error);
          }
        });

        stream.end(fileBuffer);
      });
    } catch (error) {
      console.error('Upload resume error:', error);
      throw error;
    }
  }

  async deleteResume(storagePath) {
    try {
      const file = this.bucket.file(storagePath);
      await file.delete();
      console.log(`✅ Successfully deleted file: ${storagePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting file: ${storagePath}`, error);
      throw error;
    }
  }

  async getFileMetadata(storagePath) {
    try {
      const file = this.bucket.file(storagePath);
      const [metadata] = await file.getMetadata();
      return metadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  async generateSignedUrl(storagePath, expirationTime = '1h') {
    try {
      const file = this.bucket.file(storagePath);
      const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + (expirationTime === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      };

      const [signedUrl] = await file.getSignedUrl(options);
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }
}

module.exports = new FirebaseStorageService();