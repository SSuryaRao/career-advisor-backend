const cron = require('node-cron');
const Job = require('../models/Job');
const remoteOkService = require('./remoteOkService');

class JobSyncService {
  constructor() {
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncStats = {
      totalFetched: 0,
      newJobs: 0,
      updatedJobs: 0,
      errors: 0
    };
  }

  async syncJobs() {
    if (this.isRunning) {
      console.log('⚠️ Job sync already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting job synchronization...');
    
    try {
      const jobs = await remoteOkService.fetchJobs(200);
      this.syncStats.totalFetched = jobs.length;
      
      for (const jobData of jobs) {
        try {
          await this.processJob(jobData);
        } catch (error) {
          console.error(`❌ Error processing job ${jobData.remoteId}:`, error.message);
          this.syncStats.errors++;
        }
      }

      await this.deactivateOldJobs();
      
      this.lastSyncTime = new Date();
      console.log(`✅ Job sync completed successfully!`);
      console.log(`📊 Stats: ${this.syncStats.newJobs} new, ${this.syncStats.updatedJobs} updated, ${this.syncStats.errors} errors`);
      
    } catch (error) {
      console.error('❌ Job sync failed:', error.message);
      this.syncStats.errors++;
    } finally {
      this.isRunning = false;
    }
  }

  async processJob(jobData) {
    const existingJob = await Job.findOne({ remoteId: jobData.remoteId });
    
    if (existingJob) {
      const hasChanges = this.hasSignificantChanges(existingJob, jobData);
      
      if (hasChanges) {
        await Job.findOneAndUpdate(
          { remoteId: jobData.remoteId },
          {
            ...jobData,
            updatedAt: new Date()
          }
        );
        this.syncStats.updatedJobs++;
        console.log(`🔄 Updated job: ${jobData.title} at ${jobData.company}`);
      }
    } else {
      const newJob = new Job(jobData);
      await newJob.save();
      this.syncStats.newJobs++;
      console.log(`➕ Added new job: ${jobData.title} at ${jobData.company}`);
    }
  }

  hasSignificantChanges(existingJob, newJobData) {
    const fieldsToCheck = ['title', 'description', 'applicationUrl', 'isActive'];
    
    for (const field of fieldsToCheck) {
      if (existingJob[field] !== newJobData[field]) {
        return true;
      }
    }

    if (JSON.stringify(existingJob.tags.sort()) !== JSON.stringify(newJobData.tags.sort())) {
      return true;
    }

    if (existingJob.salary.min !== newJobData.salary.min || 
        existingJob.salary.max !== newJobData.salary.max) {
      return true;
    }

    return false;
  }

  async deactivateOldJobs() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Job.updateMany(
      {
        postedAt: { $lt: thirtyDaysAgo },
        isActive: true,
        sourceApi: 'remoteok'
      },
      {
        isActive: false,
        updatedAt: new Date()
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🗑️ Deactivated ${result.modifiedCount} old jobs`);
    }
  }

  startJobSync() {
    console.log('🚀 Job sync service started');
    
    this.syncJobs();
    
    cron.schedule('0 */6 * * *', () => {
      console.log('⏰ Scheduled job sync starting...');
      this.syncJobs();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    cron.schedule('0 2 * * 0', () => {
      console.log('🧹 Weekly cleanup starting...');
      this.weeklyCleanup();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    console.log('📅 Scheduled jobs:');
    console.log('   - Job sync: Every 6 hours');
    console.log('   - Cleanup: Every Sunday at 2 AM UTC');
  }

  async weeklyCleanup() {
    try {
      console.log('🧹 Starting weekly cleanup...');
      
      const result = await Job.deleteMany({
        isActive: false,
        updatedAt: { $lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }
      });

      console.log(`🗑️ Cleaned up ${result.deletedCount} inactive jobs older than 60 days`);
      
    } catch (error) {
      console.error('❌ Weekly cleanup failed:', error.message);
    }
  }

  async forceSyncNow() {
    if (this.isRunning) {
      throw new Error('Job sync is already running');
    }
    
    this.syncStats = { totalFetched: 0, newJobs: 0, updatedJobs: 0, errors: 0 };
    await this.syncJobs();
    return this.syncStats;
  }

  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats
    };
  }
}

const jobSyncService = new JobSyncService();

module.exports = {
  startJobSync: () => jobSyncService.startJobSync(),
  forceSyncNow: () => jobSyncService.forceSyncNow(),
  getSyncStatus: () => jobSyncService.getSyncStatus()
};