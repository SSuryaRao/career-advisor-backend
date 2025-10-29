const User = require('../models/User');
const Job = require('../models/Job');
let getUserByUid;

try {
  getUserByUid = require('../config/firebase').getUserByUid;
} catch (error) {
  console.warn('Firebase Admin SDK not available, using fallback');
  getUserByUid = null;
}

class UserController {
  async getProfile(req, res) {
    try {
      const { uid, email, name, picture, emailVerified } = req.user;
      
      let user = await User.findByFirebaseUid(uid);
      
      if (!user) {
        // Create user from request data if Firebase Admin SDK is not available
        if (getUserByUid) {
          try {
            const firebaseUser = await getUserByUid(uid);
            user = await User.createFromFirebase(firebaseUser);
          } catch (firebaseError) {
            console.error('Firebase Admin SDK error, creating from token data:', firebaseError.message);
            // Fallback: create from token data
            user = await User.create({
              firebaseUid: uid,
              email: email,
              name: name || email,
              picture: picture || null,
              emailVerified: emailVerified || false,
              lastLoginAt: new Date()
            });
          }
        } else {
          // Fallback: create from token data
          user = await User.create({
            firebaseUid: uid,
            email: email,
            name: name || email,
            picture: picture || null,
            emailVerified: emailVerified || false,
            lastLoginAt: new Date()
          });
        }
        console.log(`👤 Created new user profile for: ${user.email}`);
      } else {
        user.lastLoginAt = new Date();
        await user.save();
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user profile',
        message: error.message
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { uid, email, name, picture, emailVerified } = req.user;
      const updates = req.body;

      const allowedFields = [
        'name', 'profile', 'skills', 'preferences', 'notifications'
      ];

      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      let user = await User.findOneAndUpdate(
        { firebaseUid: uid },
        { ...filteredUpdates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!user) {
        // User doesn't exist, create them first then apply updates
        if (getUserByUid) {
          try {
            const firebaseUser = await getUserByUid(uid);
            user = await User.createFromFirebase(firebaseUser);
          } catch (firebaseError) {
            console.error('Firebase Admin SDK error, creating from token data:', firebaseError.message);
            // Fallback: create from token data
            user = await User.create({
              firebaseUid: uid,
              email: email,
              name: name || email,
              picture: picture || null,
              emailVerified: emailVerified || false,
              lastLoginAt: new Date()
            });
          }
        } else {
          // Fallback: create from token data
          user = await User.create({
            firebaseUid: uid,
            email: email,
            name: name || email,
            picture: picture || null,
            emailVerified: emailVerified || false,
            lastLoginAt: new Date()
          });
        }
        console.log(`👤 Created new user profile for: ${user.email}`);
        
        // Now apply the updates to the newly created user
        Object.keys(filteredUpdates).forEach(key => {
          user[key] = filteredUpdates[key];
        });
        user.updatedAt = new Date();
        await user.save();
      }

      await user.logActivity('profile_updated', { updatedFields: Object.keys(filteredUpdates) });

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: Object.values(error.errors).map(err => err.message)
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        message: error.message
      });
    }
  }

  async getSavedJobs(req, res) {
    try {
      const { uid } = req.user;
      const { page = 1, limit = 10 } = req.query;

      let user = await User.findByFirebaseUid(uid);
      if (!user) {
        // For testing purposes, return empty saved jobs if user doesn't exist
        console.log(`User with Firebase UID ${uid} not found, returning empty saved jobs for testing`);
        return res.status(200).json({
          success: true,
          data: {
            jobs: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalJobs: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        });
      }

      const savedJobs = await User.findByFirebaseUid(uid)
        .populate({
          path: 'savedJobs.jobId',
          match: { isActive: true },
          options: {
            sort: { postedAt: -1 },
            skip: (page - 1) * limit,
            limit: parseInt(limit)
          }
        })
        .select('savedJobs');

      const jobs = savedJobs.savedJobs
        .filter(save => save.jobId)
        .map(save => ({
          ...save.jobId.toObject(),
          savedAt: save.savedAt,
          notes: save.notes
        }));

      const total = user.savedJobs.length;
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          jobs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalJobs: total,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error in getSavedJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve saved jobs',
        message: error.message
      });
    }
  }

  async saveJob(req, res) {
    try {
      const { uid } = req.user;
      const { jobId } = req.params;
      const { notes = '' } = req.body;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const user = await User.findByFirebaseUid(uid);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      await user.addSavedJob(jobId, notes);
      await user.logActivity('job_saved', { jobId, jobTitle: job.title });

      res.status(200).json({
        success: true,
        message: 'Job saved successfully',
        data: {
          jobId,
          savedAt: new Date(),
          notes
        }
      });
    } catch (error) {
      console.error('Error in saveJob:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save job',
        message: error.message
      });
    }
  }

  async unsaveJob(req, res) {
    try {
      const { uid } = req.user;
      const { jobId } = req.params;

      const user = await User.findByFirebaseUid(uid);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      await user.removeSavedJob(jobId);
      await user.logActivity('job_unsaved', { jobId });

      res.status(200).json({
        success: true,
        message: 'Job removed from saved list',
        data: { jobId }
      });
    } catch (error) {
      console.error('Error in unsaveJob:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unsave job',
        message: error.message
      });
    }
  }

  async getAppliedJobs(req, res) {
    try {
      const { uid } = req.user;
      const { page = 1, limit = 10, status } = req.query;

      const user = await User.findByFirebaseUid(uid)
        .populate({
          path: 'appliedJobs.jobId',
          match: { isActive: true }
        })
        .select('appliedJobs');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      let appliedJobs = user.appliedJobs.filter(app => app.jobId);

      if (status) {
        appliedJobs = appliedJobs.filter(app => app.status === status);
      }

      const total = appliedJobs.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      
      const paginatedJobs = appliedJobs.slice(startIndex, endIndex).map(app => ({
        ...app.jobId.toObject(),
        appliedAt: app.appliedAt,
        applicationStatus: app.status,
        notes: app.notes
      }));

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          jobs: paginatedJobs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalJobs: total,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error in getAppliedJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve applied jobs',
        message: error.message
      });
    }
  }

  async markJobAsApplied(req, res) {
    try {
      const { uid } = req.user;
      const { jobId } = req.params;
      const { status = 'applied', notes = '' } = req.body;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const user = await User.findByFirebaseUid(uid);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      await user.addAppliedJob(jobId, status, notes);
      await user.logActivity('job_applied', { 
        jobId, 
        jobTitle: job.title, 
        status 
      });

      res.status(200).json({
        success: true,
        message: 'Job application status updated',
        data: {
          jobId,
          status,
          appliedAt: new Date(),
          notes
        }
      });
    } catch (error) {
      console.error('Error in markJobAsApplied:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update job application status',
        message: error.message
      });
    }
  }

  async getActivityLog(req, res) {
    try {
      const { uid } = req.user;
      const { page = 1, limit = 20 } = req.query;

      const user = await User.findByFirebaseUid(uid).select('activityLog');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const activities = user.activityLog.sort((a, b) => b.timestamp - a.timestamp);
      const total = activities.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      
      const paginatedActivities = activities.slice(startIndex, endIndex);
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          activities: paginatedActivities,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error in getActivityLog:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve activity log',
        message: error.message
      });
    }
  }

  async deleteAccount(req, res) {
    try {
      const { uid } = req.user;

      const user = await User.findOneAndUpdate(
        { firebaseUid: uid },
        { 
          isActive: false,
          deletedAt: new Date(),
          email: `deleted_${Date.now()}_${uid}@deleted.com`
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        message: error.message
      });
    }
  }
}

module.exports = new UserController();