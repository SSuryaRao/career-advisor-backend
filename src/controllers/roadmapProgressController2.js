const RoadmapProgress = require('../models/RoadmapProgress');
const User = require('../models/User');

class RoadmapProgressController {

  // Save or update roadmap progress
  async saveRoadmapProgress(req, res) {
    try {
      const { userId, domain, skillLevel, completedMilestones, roadmapData, title } = req.body;

      if (!userId || !domain || !skillLevel || !roadmapData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Convert Firebase UID to MongoDB ObjectId
      let mongoUserId = userId;
      try {
        const user = await User.findByFirebaseUid(userId);
        if (user) {
          mongoUserId = user._id.toString();
        }
      } catch (error) {
        console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
      }

      // Find existing roadmap or create new one
      let roadmap = await RoadmapProgress.findOne({
        userId: mongoUserId,
        careerDomain: domain,
        skillLevel
      });
      
      if (roadmap) {
        // Update existing roadmap
        roadmap.completedMilestones = completedMilestones || [];
        roadmap.roadmapData = roadmapData;
        roadmap.updatedAt = new Date();

        await roadmap.save();
      } else {
        // Create new roadmap
        roadmap = await RoadmapProgress.create({
          userId: mongoUserId,
          careerDomain: domain,
          skillLevel,
          completedMilestones: completedMilestones || [],
          roadmapData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      res.status(200).json({
        success: true,
        data: roadmap,
        message: 'Roadmap progress saved successfully'
      });

    } catch (error) {
      console.error('Error saving roadmap progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save roadmap progress',
        message: error.message
      });
    }
  }

  // Get roadmap progress
  async getRoadmapProgress(req, res) {
    try {
      const { userId, domain, skillLevel } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      // Convert Firebase UID to MongoDB ObjectId
      let mongoUserId = userId;
      try {
        const user = await User.findByFirebaseUid(userId);
        if (user) {
          mongoUserId = user._id.toString();
        }
      } catch (error) {
        console.log(`Error finding user by Firebase UID ${userId}:`, error.message);
      }

      let query = { userId: mongoUserId };
      if (domain) query.careerDomain = domain;
      if (skillLevel) query.skillLevel = skillLevel;

      const roadmaps = await RoadmapProgress.find(query).sort({ updatedAt: -1 });

      res.status(200).json({
        success: true,
        data: roadmaps
      });

    } catch (error) {
      console.error('Error fetching roadmap progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roadmap progress',
        message: error.message
      });
    }
  }

  // Get user's active roadmaps
  async getUserRoadmaps(req, res) {
    try {
      const { uid } = req.user;

      // Convert Firebase UID to MongoDB ObjectId
      let mongoUserId = uid;
      try {
        const user = await User.findByFirebaseUid(uid);
        if (user) {
          mongoUserId = user._id.toString();
        }
      } catch (error) {
        console.log(`Error finding user by Firebase UID ${uid}:`, error.message);
      }

      const roadmaps = await RoadmapProgress.find({
        userId: mongoUserId
      }).sort({ updatedAt: -1 });

      res.status(200).json({
        success: true,
        data: roadmaps
      });

    } catch (error) {
      console.error('Error fetching user roadmaps:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roadmaps',
        message: error.message
      });
    }
  }

  // Mark milestone as completed/incomplete
  async toggleMilestone(req, res) {
    try {
      const { roadmapId, milestoneId, milestoneTitle, isCompleted } = req.body;
      const { uid } = req.user;

      // Convert Firebase UID to MongoDB ObjectId
      let mongoUserId = uid;
      try {
        const user = await User.findByFirebaseUid(uid);
        if (user) {
          mongoUserId = user._id.toString();
        }
      } catch (error) {
        console.log(`Error finding user by Firebase UID ${uid}:`, error.message);
      }

      const roadmap = await RoadmapProgress.findOne({
        _id: roadmapId,
        userId: mongoUserId
      });

      if (!roadmap) {
        return res.status(404).json({
          success: false,
          error: 'Roadmap not found'
        });
      }

      if (isCompleted) {
        // Add milestone if not already completed
        const existing = roadmap.completedMilestones.find(m => m.milestoneId === milestoneId);
        if (!existing) {
          roadmap.completedMilestones.push({
            milestoneId,
            completedAt: new Date()
          });
        }
      } else {
        // Remove milestone
        roadmap.completedMilestones = roadmap.completedMilestones.filter(
          m => m.milestoneId !== milestoneId
        );
      }

      await roadmap.save();

      res.status(200).json({
        success: true,
        data: roadmap,
        message: `Milestone ${isCompleted ? 'completed' : 'marked incomplete'} successfully`
      });

    } catch (error) {
      console.error('Error toggling milestone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update milestone',
        message: error.message
      });
    }
  }

  // Get roadmap statistics
  async getRoadmapStats(req, res) {
    try {
      const { uid } = req.user;

      // Convert Firebase UID to MongoDB ObjectId
      let mongoUserId = uid;
      try {
        const user = await User.findByFirebaseUid(uid);
        if (user) {
          mongoUserId = user._id.toString();
        }
      } catch (error) {
        console.log(`Error finding user by Firebase UID ${uid}:`, error.message);
      }

      const roadmaps = await RoadmapProgress.find({
        userId: mongoUserId
      });

      // Calculate completion percentages
      const roadmapsWithProgress = roadmaps.map(r => {
        const totalMilestones = r.roadmapData?.stages?.reduce(
          (total, stage) => total + (stage.milestones?.length || 0), 0
        ) || 0;
        const completedPercentage = totalMilestones > 0
          ? Math.round((r.completedMilestones.length / totalMilestones) * 100)
          : 0;
        return { ...r.toObject(), completedPercentage, totalMilestones };
      });

      const stats = {
        totalRoadmaps: roadmapsWithProgress.length,
        completedRoadmaps: roadmapsWithProgress.filter(r => r.completedPercentage === 100).length,
        inProgressRoadmaps: roadmapsWithProgress.filter(r => r.completedPercentage > 0 && r.completedPercentage < 100).length,
        totalMilestonesCompleted: roadmapsWithProgress.reduce((acc, r) => acc + r.completedMilestones.length, 0),
        averageProgress: roadmapsWithProgress.length > 0
          ? Math.round(roadmapsWithProgress.reduce((acc, r) => acc + r.completedPercentage, 0) / roadmapsWithProgress.length)
          : 0,
        recentActivity: roadmapsWithProgress
          .filter(r => r.completedMilestones.length > 0)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 5)
          .map(r => ({
            roadmapTitle: r.roadmapData?.domain || r.careerDomain,
            domain: r.careerDomain,
            lastMilestone: r.completedMilestones[r.completedMilestones.length - 1],
            progress: r.completedPercentage
          }))
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching roadmap stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roadmap statistics',
        message: error.message
      });
    }
  }

  // Delete/deactivate roadmap
  async deactivateRoadmap(req, res) {
    try {
      const { roadmapId } = req.params;
      const { uid } = req.user;

      // Convert Firebase UID to MongoDB ObjectId
      let mongoUserId = uid;
      try {
        const user = await User.findByFirebaseUid(uid);
        if (user) {
          mongoUserId = user._id.toString();
        }
      } catch (error) {
        console.log(`Error finding user by Firebase UID ${uid}:`, error.message);
      }

      const roadmap = await RoadmapProgress.findOne({
        _id: roadmapId,
        userId: mongoUserId
      });

      if (!roadmap) {
        return res.status(404).json({
          success: false,
          error: 'Roadmap not found'
        });
      }

      // Delete the roadmap entirely
      await RoadmapProgress.deleteOne({ _id: roadmapId });

      res.status(200).json({
        success: true,
        message: 'Roadmap deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting roadmap:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete roadmap',
        message: error.message
      });
    }
  }
}

module.exports = new RoadmapProgressController();