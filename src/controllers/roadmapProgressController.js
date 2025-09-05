const RoadmapProgress = require('../models/RoadmapProgress');

const roadmapProgressController = {
  // Save or update roadmap progress
  saveProgress: async (req, res) => {
    try {
      const { userId, careerDomain, skillLevel, completedMilestones, roadmapData } = req.body;

      if (!userId || !careerDomain || !skillLevel || !roadmapData) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'userId, careerDomain, skillLevel, and roadmapData are required'
        });
      }

      // Find existing progress or create new
      let progress = await RoadmapProgress.findOneAndUpdate(
        { userId, careerDomain, skillLevel },
        {
          completedMilestones: completedMilestones || [],
          roadmapData,
          updatedAt: new Date()
        },
        {
          new: true,
          upsert: true,
          runValidators: true
        }
      );

      res.status(200).json({
        success: true,
        message: 'Roadmap progress saved successfully',
        data: progress
      });
    } catch (error) {
      console.error('Error saving roadmap progress:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to save roadmap progress'
      });
    }
  },

  // Get roadmap progress for a user
  getProgress: async (req, res) => {
    try {
      const { userId, careerDomain, skillLevel } = req.query;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'userId is required'
        });
      }

      let query = { userId };
      if (careerDomain) query.careerDomain = careerDomain;
      if (skillLevel) query.skillLevel = skillLevel;

      const progress = await RoadmapProgress.find(query).sort({ updatedAt: -1 });

      res.status(200).json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error fetching roadmap progress:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch roadmap progress'
      });
    }
  },

  // Toggle milestone completion
  toggleMilestone: async (req, res) => {
    try {
      const { userId, careerDomain, skillLevel, milestoneId } = req.body;

      if (!userId || !careerDomain || !skillLevel || !milestoneId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'userId, careerDomain, skillLevel, and milestoneId are required'
        });
      }

      const progress = await RoadmapProgress.findOne({ userId, careerDomain, skillLevel });

      if (!progress) {
        return res.status(404).json({
          error: 'Progress not found',
          message: 'No roadmap progress found for the specified parameters'
        });
      }

      // Check if milestone is already completed
      const existingIndex = progress.completedMilestones.findIndex(
        m => m.milestoneId === milestoneId
      );

      if (existingIndex >= 0) {
        // Remove milestone (mark as incomplete)
        progress.completedMilestones.splice(existingIndex, 1);
      } else {
        // Add milestone (mark as complete)
        progress.completedMilestones.push({
          milestoneId,
          completedAt: new Date()
        });
      }

      await progress.save();

      res.status(200).json({
        success: true,
        message: 'Milestone toggled successfully',
        data: {
          milestoneId,
          completed: existingIndex < 0,
          completedMilestones: progress.completedMilestones
        }
      });
    } catch (error) {
      console.error('Error toggling milestone:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to toggle milestone'
      });
    }
  },

  // Get all roadmaps for a user
  getUserRoadmaps: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'userId is required'
        });
      }

      const roadmaps = await RoadmapProgress.find({ userId }).sort({ updatedAt: -1 });

      // Calculate progress for each roadmap
      const roadmapsWithProgress = roadmaps.map(roadmap => {
        const totalMilestones = roadmap.roadmapData.stages.reduce(
          (total, stage) => total + stage.milestones.length, 0
        );
        const completedCount = roadmap.completedMilestones.length;
        const progressPercentage = Math.round((completedCount / totalMilestones) * 100);

        return {
          ...roadmap.toObject(),
          stats: {
            totalMilestones,
            completedMilestones: completedCount,
            progressPercentage
          }
        };
      });

      res.status(200).json({
        success: true,
        data: roadmapsWithProgress
      });
    } catch (error) {
      console.error('Error fetching user roadmaps:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch user roadmaps'
      });
    }
  },

  // Delete a roadmap
  deleteRoadmap: async (req, res) => {
    try {
      const { userId, careerDomain, skillLevel } = req.params;

      const deleted = await RoadmapProgress.findOneAndDelete({
        userId,
        careerDomain,
        skillLevel
      });

      if (!deleted) {
        return res.status(404).json({
          error: 'Roadmap not found',
          message: 'No roadmap found with the specified parameters'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Roadmap deleted successfully',
        data: deleted
      });
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete roadmap'
      });
    }
  }
};

module.exports = roadmapProgressController;