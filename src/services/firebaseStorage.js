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
    const startTime = Date.now();

    try {
      console.log(`📤 Starting upload: ${originalName} (${(fileBuffer.length / 1024).toFixed(2)} KB) for user: ${userId}`);

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('Invalid file buffer: empty or null');
      }

      if (!this.bucket) {
        throw new Error('Firebase Storage bucket not initialized');
      }

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
        resumable: false,
        validation: 'crc32c'
      });

      return new Promise((resolve, reject) => {
        let uploadComplete = false;

        stream.on('error', (error) => {
          if (uploadComplete) return;
          uploadComplete = true;

          console.error('❌ Firebase Storage upload error:', {
            message: error.message,
            code: error.code,
            timeMs: Date.now() - startTime
          });

          reject(new Error(`Firebase upload failed: ${error.message}`));
        });

        stream.on('finish', async () => {
          if (uploadComplete) return;

          try {
            console.log(`✅ File written to storage in ${Date.now() - startTime}ms, making public...`);

            await file.makePublic();

            const downloadURL = `https://storage.googleapis.com/${this.bucket.name}/${storagePath}`;

            uploadComplete = true;

            console.log(`✅ Upload complete in ${Date.now() - startTime}ms: ${downloadURL}`);

            resolve({
              firebaseUrl: downloadURL,
              firebaseStoragePath: storagePath,
              filename: uniqueFileName
            });
          } catch (error) {
            if (uploadComplete) return;
            uploadComplete = true;

            console.error('❌ Error making file public:', {
              message: error.message,
              timeMs: Date.now() - startTime
            });

            reject(new Error(`Failed to make file public: ${error.message}`));
          }
        });

        // Handle write completion timeout
        setTimeout(() => {
          if (!uploadComplete) {
            uploadComplete = true;
            reject(new Error('Upload stream timeout - no finish event received'));
          }
        }, 55000); // 55 seconds (less than controller timeout)

        stream.end(fileBuffer);
      });
    } catch (error) {
      console.error(`❌ Upload resume error after ${Date.now() - startTime}ms:`, error.message);
      throw new Error(`Firebase upload failed: ${error.message}`);
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