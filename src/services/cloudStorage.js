const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CloudStorageService {
  constructor() {
    this.storage = null;
    this.bucket = null;
    this.bucketName = process.env.GCS_BUCKET_NAME || 'career-advisor-interview-temp';
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.isConfigured = false;

    this.initialize();
  }

  initialize() {
    try {
      if (!this.projectId) {
        console.warn('⚠️ Cloud Storage not configured. Missing GOOGLE_CLOUD_PROJECT_ID');
        this.isConfigured = false;
        return;
      }

      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (credentials) {
        this.storage = new Storage({
          projectId: this.projectId,
          keyFilename: credentials
        });
      } else {
        this.storage = new Storage({
          projectId: this.projectId
        });
      }

      this.bucket = this.storage.bucket(this.bucketName);

      console.log('✅ Cloud Storage initialized successfully');
      console.log(`📦 Bucket: ${this.bucketName}`);
      this.isConfigured = true;

    } catch (error) {
      console.error('❌ Failed to initialize Cloud Storage:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Upload buffer to Cloud Storage with a specific path
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filePath - Destination file path in bucket
   * @param {string} contentType - Content type
   * @returns {Promise<string>} GCS URI (gs://bucket/path)
   */
  async uploadBuffer(fileBuffer, filePath, contentType) {
    if (!this.isConfigured) {
      throw new Error('Cloud Storage is not configured');
    }

    try {
      const file = this.bucket.file(filePath);

      await file.save(fileBuffer, {
        metadata: {
          contentType,
          metadata: {
            uploadedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
          }
        }
      });

      const gcsUri = `gs://${this.bucketName}/${filePath}`;
      return gcsUri;

    } catch (error) {
      console.error('❌ Error uploading buffer:', error.message);
      throw error;
    }
  }

  /**
   * Upload interview video/audio to temporary storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - MIME type (video/webm, audio/webm, etc.)
   * @param {string} userId - User ID
   * @param {string} sessionId - Interview session ID
   * @returns {Promise<Object>} Upload result with file path and URL
   */
  async uploadInterviewRecording(fileBuffer, mimeType, userId, sessionId) {
    if (!this.isConfigured) {
      throw new Error('Cloud Storage is not configured');
    }

    try {
      const fileExtension = this.getFileExtension(mimeType);
      const fileName = `interviews/${userId}/${sessionId}/${uuidv4()}.${fileExtension}`;
      const file = this.bucket.file(fileName);

      console.log(`📤 Uploading interview recording: ${fileName}`);

      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            userId,
            sessionId,
            uploadedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
          }
        }
      });

      // Generate signed URL (valid for 1 hour)
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000 // 1 hour
      });

      console.log(`✅ Interview recording uploaded successfully`);

      return {
        fileName,
        filePath: `gs://${this.bucketName}/${fileName}`,
        signedUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      };

    } catch (error) {
      console.error('❌ Error uploading interview recording:', error.message);
      throw error;
    }
  }

  /**
   * Get file extension from MIME type
   */
  getFileExtension(mimeType) {
    const mimeMap = {
      'video/webm': 'webm',
      'video/mp4': 'mp4',
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav'
    };

    return mimeMap[mimeType] || 'webm';
  }

  /**
   * Delete file from Cloud Storage
   * @param {string} fileName - File name in bucket
   */
  async deleteFile(fileName) {
    if (!this.isConfigured) {
      console.warn('Cloud Storage not configured, skipping deletion');
      return;
    }

    try {
      const file = this.bucket.file(fileName);
      await file.delete();
      console.log(`🗑️ Deleted file: ${fileName}`);
    } catch (error) {
      console.error('❌ Error deleting file:', error.message);
      // Don't throw - deletion failures shouldn't break the flow
    }
  }

  /**
   * Delete interview recording after processing
   * @param {string} fileName - File name in bucket
   */
  async deleteInterviewRecording(fileName) {
    return this.deleteFile(fileName);
  }

  /**
   * Cleanup old interview recordings (older than 1 hour)
   * This runs as a scheduled job
   */
  async cleanupExpiredRecordings() {
    if (!this.isConfigured) {
      return;
    }

    try {
      console.log('🧹 Starting cleanup of expired interview recordings...');

      const [files] = await this.bucket.getFiles({
        prefix: 'interviews/'
      });

      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        try {
          const [metadata] = await file.getMetadata();
          const expiresAt = metadata.metadata?.expiresAt;

          if (expiresAt && new Date(expiresAt).getTime() < now) {
            await file.delete();
            deletedCount++;
            console.log(`🗑️ Deleted expired recording: ${file.name}`);
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error.message);
        }
      }

      console.log(`✅ Cleanup complete. Deleted ${deletedCount} expired recordings`);

    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
  }

  /**
   * Ensure bucket exists, create if not
   */
  async ensureBucketExists() {
    if (!this.isConfigured) {
      throw new Error('Cloud Storage is not configured');
    }

    try {
      const [exists] = await this.bucket.exists();

      if (!exists) {
        console.log(`📦 Creating bucket: ${this.bucketName}`);
        await this.storage.createBucket(this.bucketName, {
          location: 'US',
          storageClass: 'STANDARD',
          lifecycle: {
            rule: [
              {
                action: { type: 'Delete' },
                condition: { age: 1 } // Delete files older than 1 day
              }
            ]
          }
        });
        console.log(`✅ Bucket created: ${this.bucketName}`);
      }

    } catch (error) {
      console.error('❌ Error ensuring bucket exists:', error.message);
      throw error;
    }
  }

  /**
   * Get file from Cloud Storage
   * @param {string} fileName - File name in bucket
   * @returns {Promise<Buffer>} File buffer
   */
  async getFile(fileName) {
    if (!this.isConfigured) {
      throw new Error('Cloud Storage is not configured');
    }

    try {
      const file = this.bucket.file(fileName);
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      console.error('❌ Error downloading file:', error.message);
      throw error;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      projectId: this.projectId,
      bucketName: this.bucketName,
      storageInitialized: this.storage !== null
    };
  }
}

// Export singleton instance
module.exports = new CloudStorageService();
