const Job = require('../models/Job');
const jobRecommendationService = require('../services/jobRecommendationService');

class JobController {
  async getAllJobs(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        location,
        tags,
        company,
        jobType,
        experienceLevel,
        sortBy = 'postedAt',
        sortOrder = 'desc',
        daysOld
      } = req.query;

      const skip = (page - 1) * limit;
      const query = { isActive: true };

      // Filter by job age (days old)
      if (daysOld) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(daysOld));
        query.postedAt = { $gte: daysAgo };
      }

      // Enhanced search - search in title, company, description, and tags
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { title: searchRegex },
          { company: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } }
        ];
      }

      // Location filter
      if (location) {
        query.location = new RegExp(location, 'i');
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        query.tags = { $in: tagArray.map(tag => tag.toLowerCase().trim()) };
      }

      if (company) {
        query.company = new RegExp(company, 'i');
      }

      if (jobType) {
        query.jobType = jobType;
      }

      if (experienceLevel) {
        query.experienceLevel = experienceLevel;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const jobs = await Job.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Job.countDocuments(query);
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
            hasPrev: page > 1,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error in getAllJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve jobs',
        message: error.message
      });
    }
  }

  async getJobById(req, res) {
    try {
      const { id } = req.params;

      const job = await Job.findById(id).lean();

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      res.status(200).json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error in getJobById:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid job ID format'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job',
        message: error.message
      });
    }
  }

  async getFeaturedJobs(req, res) {
    try {
      const { limit = 6 } = req.query;

      const jobs = await Job.find({ isActive: true, featured: true })
        .sort({ postedAt: -1 })
        .limit(parseInt(limit))
        .lean();

      res.status(200).json({
        success: true,
        data: jobs
      });
    } catch (error) {
      console.error('Error in getFeaturedJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve featured jobs',
        message: error.message
      });
    }
  }

  async getJobStats(req, res) {
    try {
      const totalJobs = await Job.countDocuments({ isActive: true });
      const totalCompanies = await Job.distinct('company', { isActive: true });
      
      const jobTypeStats = await Job.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$jobType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const experienceLevelStats = await Job.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$experienceLevel', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const topTags = await Job.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const recentJobsCount = await Job.countDocuments({
        isActive: true,
        postedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      res.status(200).json({
        success: true,
        data: {
          totalJobs,
          totalCompanies: totalCompanies.length,
          recentJobs: recentJobsCount,
          jobTypeBreakdown: jobTypeStats,
          experienceLevelBreakdown: experienceLevelStats,
          topTags: topTags.map(tag => ({ name: tag._id, count: tag.count }))
        }
      });
    } catch (error) {
      console.error('Error in getJobStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job statistics',
        message: error.message
      });
    }
  }

  async searchJobs(req, res) {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long'
        });
      }

      const searchResults = await Job.find({
        $and: [
          { isActive: true },
          {
            $or: [
              { title: new RegExp(query, 'i') },
              { company: new RegExp(query, 'i') },
              { tags: { $in: [new RegExp(query, 'i')] } },
              { description: new RegExp(query, 'i') }
            ]
          }
        ]
      })
      .sort({ postedAt: -1 })
      .limit(parseInt(limit))
      .select('title company tags postedAt jobType experienceLevel')
      .lean();

      res.status(200).json({
        success: true,
        data: {
          jobs: searchResults,
          total: searchResults.length
        }
      });
    } catch (error) {
      console.error('Error in searchJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message
      });
    }
  }

  /**
   * Get AI-powered job recommendations for authenticated user
   */
  async getRecommendations(req, res) {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please login to get personalized recommendations'
        });
      }

      const { limit, minMatchScore } = req.query;

      const options = {
        limit: limit ? parseInt(limit) : 10,
        minMatchScore: minMatchScore ? parseInt(minMatchScore) : 50,
        includeReasons: true
      };

      console.log(`🎯 Getting job recommendations for user ${firebaseUid}`);

      const result = await jobRecommendationService.getRecommendations(firebaseUid, options);

      // Increment usage BEFORE sending response
      const { incrementUsageForRequest } = require('../middleware/usageLimits');
      await incrementUsageForRequest(req);

      res.status(200).json({
        success: result.success,
        data: result.recommendations,
        total: result.total,
        message: result.message
      });

    } catch (error) {
      console.error('Error in getRecommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations',
        message: error.message
      });
    }
  }
}

module.exports = new JobController();