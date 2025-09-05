const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class LocalStorageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads/resumes');
  }

  async uploadResume(fileBuffer, originalName, userId) {
    try {
      // Generate unique filename
      const uniqueFileName = `${uuidv4()}-${originalName}`;
      const uploadPath = path.join(this.uploadDir, uniqueFileName);

      // Ensure uploads directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Write file to disk
      await fs.writeFile(uploadPath, fileBuffer);

      return {
        firebaseUrl: `/uploads/resumes/${uniqueFileName}`, // Temporary local URL
        firebaseStoragePath: uploadPath, // Local path for deletion
        filename: uniqueFileName
      };
    } catch (error) {
      console.error('Local storage upload error:', error);
      throw error;
    }
  }

  async deleteResume(localPath) {
    try {
      await fs.unlink(localPath);
      console.log(`✅ Successfully deleted local file: ${localPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting local file: ${localPath}`, error);
      throw error;
    }
  }
}

module.exports = new LocalStorageService();