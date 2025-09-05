const express = require('express');
const Scholarship = require('../models/Scholarship');

const router = express.Router();

// GET /api/scholarships - Get all scholarships with optional filters
router.get('/', async (req, res) => {
  try {
    const {
      category,
      domain,
      trending,
      limit = 20,
      page = 1
    } = req.query;

    // Build filter object
    const filter = { active: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (domain && domain !== 'all') {
      filter.domain = domain;
    }
    
    if (trending === 'true') {
      filter.trending = true;
    }

    // Calculate pagination
    const skip = (page - 1) * parseInt(limit);

    // Get scholarships with filters and pagination
    const scholarships = await Scholarship.find(filter)
      .sort({ trending: -1, deadline: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Scholarship.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: scholarships,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scholarships',
      error: error.message
    });
  }
});

// GET /api/scholarships/trending - Get trending scholarships
router.get('/trending', async (req, res) => {
  try {
    const scholarships = await Scholarship.find({ 
      active: true, 
      trending: true 
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: scholarships
    });
  } catch (error) {
    console.error('Error fetching trending scholarships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending scholarships',
      error: error.message
    });
  }
});

// GET /api/scholarships/:id - Get single scholarship
router.get('/:id', async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }

    res.json({
      success: true,
      data: scholarship
    });
  } catch (error) {
    console.error('Error fetching scholarship:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scholarship',
      error: error.message
    });
  }
});

module.exports = router;