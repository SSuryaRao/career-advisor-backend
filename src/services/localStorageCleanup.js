const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class LocalStorageCleanupService {
  constructor() {
    this.cleanupIntervalHours = 24; // 24 hours = 1 day
    this.isRunning = false;
  }

  /**
   * Check if a file should be deleted based on its age
   * @param {string} filePath - Full path to the file
   * @param {number} maxAgeHours - Maximum age in hours before deletion
   * @returns {boolean} - True if file should be deleted
   */
  shouldDeleteFile(filePath, maxAgeHours = 24) {
    try {
      const stats = fs.statSync(filePath);
      const fileAgeMs = Date.now() - stats.mtime.getTime();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
      
      return fileAgeMs > maxAgeMs;
    } catch (error) {
      console.error(`Error checking file age for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Clean up files in a directory that are older than specified age
   * @param {string} dirPath - Directory path to clean
   * @param {number} maxAgeHours - Maximum file age in hours
   * @returns {Object} - Cleanup statistics
   */
  async cleanupDirectory(dirPath, maxAgeHours = 24) {
    const stats = {
      totalFiles: 0,
      deletedFiles: 0,
      errors: 0,
      deletedFilesList: [],
      errorsList: []
    };

    try {
      // Check if directory exists
      if (!fs.existsSync(dirPath)) {
        console.log(`Directory does not exist: ${dirPath}`);
        return stats;
      }

      const files = fs.readdirSync(dirPath);
      stats.totalFiles = files.length;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        
        try {
          // Skip directories and system files
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) {
            continue;
          }

          // Check if file should be deleted
          if (this.shouldDeleteFile(filePath, maxAgeHours)) {
            fs.unlinkSync(filePath);
            stats.deletedFiles++;
            stats.deletedFilesList.push(file);
            console.log(`✅ Deleted old file: ${file}`);
          }
        } catch (error) {
          stats.errors++;
          stats.errorsList.push({ file, error: error.message });
          console.error(`❌ Error deleting file ${file}:`, error.message);
        }
      }

      return stats;
    } catch (error) {
      console.error(`Error cleaning directory ${dirPath}:`, error);
      stats.errors++;
      stats.errorsList.push({ directory: dirPath, error: error.message });
      return stats;
    }
  }

  /**
   * Clean up local storage directories
   * This only affects LOCAL files, cloud storage is never touched
   */
  async performCleanup() {
    console.log('🧹 Starting local storage cleanup...');
    const startTime = Date.now();

    const directories = [
      {
        path: path.join(process.cwd(), 'uploads'),
        description: 'General uploads'
      },
      {
        path: path.join(process.cwd(), 'uploads', 'resumes'),
        description: 'Resume uploads'
      },
      {
        path: path.join(process.cwd(), 'uploads', 'profiles'),
        description: 'Profile uploads'
      },
      {
        path: path.join(process.cwd(), 'temp'),
        description: 'Temporary files'
      }
    ];

    let totalStats = {
      totalFiles: 0,
      deletedFiles: 0,
      errors: 0,
      directories: []
    };

    for (const dir of directories) {
      console.log(`🔍 Cleaning ${dir.description} (${dir.path})...`);
      const dirStats = await this.cleanupDirectory(dir.path, this.cleanupIntervalHours);
      
      totalStats.totalFiles += dirStats.totalFiles;
      totalStats.deletedFiles += dirStats.deletedFiles;
      totalStats.errors += dirStats.errors;
      totalStats.directories.push({
        ...dir,
        ...dirStats
      });

      if (dirStats.deletedFiles > 0) {
        console.log(`✨ Cleaned ${dirStats.deletedFiles} files from ${dir.description}`);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`🏁 Cleanup completed in ${duration}s`);
    console.log(`📊 Summary: ${totalStats.deletedFiles} files deleted, ${totalStats.errors} errors`);
    
    // Log summary to file for monitoring
    this.logCleanupSummary(totalStats, duration);

    return totalStats;
  }

  /**
   * Log cleanup summary to a log file
   */
  logCleanupSummary(stats, duration) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'cleanup.log');
      const logEntry = {
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        totalFiles: stats.totalFiles,
        deletedFiles: stats.deletedFiles,
        errors: stats.errors,
        directories: stats.directories.map(d => ({
          path: d.path,
          description: d.description,
          totalFiles: d.totalFiles,
          deletedFiles: d.deletedFiles,
          errors: d.errors
        }))
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Error writing cleanup log:', error);
    }
  }

  /**
   * Start the automated cleanup service
   * Runs every day at 2 AM to clean up files older than 24 hours
   */
  startScheduledCleanup() {
    if (this.isRunning) {
      console.log('⚠️  Cleanup service is already running');
      return;
    }

    console.log('🚀 Starting local storage cleanup service...');
    console.log('⏰ Scheduled to run daily at 2:00 AM');
    console.log(`🕐 Files older than ${this.cleanupIntervalHours} hours will be deleted`);
    console.log('☁️  Cloud storage files are NEVER affected');

    // Schedule cleanup to run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('⏰ Scheduled cleanup triggered at 2:00 AM');
      await this.performCleanup();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Also run cleanup on service start (for files that might be old)
    setTimeout(async () => {
      console.log('🧹 Running initial cleanup check...');
      await this.performCleanup();
    }, 5000); // Wait 5 seconds after server start

    this.isRunning = true;
    console.log('✅ Local storage cleanup service started successfully');
  }

  /**
   * Stop the cleanup service
   */
  stopScheduledCleanup() {
    if (!this.isRunning) {
      console.log('⚠️  Cleanup service is not running');
      return;
    }

    this.isRunning = false;
    console.log('🛑 Local storage cleanup service stopped');
  }

  /**
   * Manual cleanup trigger (for testing or immediate cleanup)
   */
  async triggerManualCleanup() {
    console.log('🔧 Manual cleanup triggered');
    return await this.performCleanup();
  }

  /**
   * Get cleanup service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupIntervalHours: this.cleanupIntervalHours,
      nextCleanupTime: this.isRunning ? 'Daily at 2:00 AM UTC' : 'Not scheduled',
      targetDirectories: [
        'uploads/',
        'uploads/resumes/',
        'uploads/profiles/',
        'temp/'
      ]
    };
  }
}

// Create singleton instance
const localCleanupService = new LocalStorageCleanupService();

module.exports = {
  LocalStorageCleanupService,
  localCleanupService
};