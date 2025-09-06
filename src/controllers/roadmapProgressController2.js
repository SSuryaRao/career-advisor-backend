const Roadmap = require('../models/Roadmap');
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

      // Find existing roadmap or create new one
      let roadmap = await Roadmap.findByUserAndCriteria(userId, domain, skillLevel);
      
      if (roadmap) {
        // Update existing roadmap
        roadmap.completedMilestones = completedMilestones || [];
        roadmap.roadmapData = roadmapData;
        roadmap.title = title || roadmapData.domain || domain;
        
        // Update progress object
        const progress = {};
        (completedMilestones || []).forEach(milestone => {
          progress[milestone.milestoneId] = true;
        });
        roadmap.progress = progress;
        
        await roadmap.save();
      } else {
        // Create new roadmap
        const progress = {};
        (completedMilestones || []).forEach(milestone => {
          progress[milestone.milestoneId] = true;
        });

        roadmap = await Roadmap.create({
          userId,
          domain,
          skillLevel,
          title: title || roadmapData.domain || domain,
          completedMilestones: completedMilestones || [],
          roadmapData,
          progress
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

      let query = { userId, isActive: true };
      if (domain) query.domain = domain;
      if (skillLevel) query.skillLevel = skillLevel;

      const roadmaps = await Roadmap.find(query).sort({ lastUpdated: -1 });

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
      
      const roadmaps = await Roadmap.find({ 
        userId: uid, 
        isActive: true 
      }).sort({ lastUpdated: -1 });

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

      const roadmap = await Roadmap.findOne({ 
        roadmapId, 
        userId: uid,
        isActive: true 
      });

      if (!roadmap) {
        return res.status(404).json({
          success: false,
          error: 'Roadmap not found'
        });
      }

      if (isCompleted) {
        await roadmap.markMilestoneCompleted(milestoneId, milestoneTitle);
      } else {
        await roadmap.markMilestoneIncomplete(milestoneId);
      }

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

      const roadmaps = await Roadmap.find({ 
        userId: uid, 
        isActive: true 
      });

      const stats = {
        totalRoadmaps: roadmaps.length,
        completedRoadmaps: roadmaps.filter(r => r.completedPercentage === 100).length,
        inProgressRoadmaps: roadmaps.filter(r => r.completedPercentage > 0 && r.completedPercentage < 100).length,
        totalMilestonesCompleted: roadmaps.reduce((acc, r) => acc + r.completedMilestones.length, 0),
        averageProgress: roadmaps.length > 0 
          ? Math.round(roadmaps.reduce((acc, r) => acc + r.completedPercentage, 0) / roadmaps.length)
          : 0,
        recentActivity: roadmaps
          .filter(r => r.completedMilestones.length > 0)
          .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
          .slice(0, 5)
          .map(r => ({
            roadmapTitle: r.title,
            domain: r.domain,
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

      const roadmap = await Roadmap.findOne({ 
        roadmapId, 
        userId: uid 
      });

      if (!roadmap) {
        return res.status(404).json({
          success: false,
          error: 'Roadmap not found'
        });
      }

      roadmap.isActive = false;
      await roadmap.save();

      res.status(200).json({
        success: true,
        message: 'Roadmap deactivated successfully'
      });

    } catch (error) {
      console.error('Error deactivating roadmap:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate roadmap',
        message: error.message
      });
    }
  }
}

module.exports = new RoadmapProgressController();