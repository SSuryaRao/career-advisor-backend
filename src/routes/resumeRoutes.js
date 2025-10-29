const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const {
  uploadAndAnalyzeResume,
  getResumeHistory,
  getResumeAnalysis,
  deleteResume,
  getAnalytics
} = require('../controllers/resumeController');
const {
  improveResume,
  getImprovementStatus
} = require('../controllers/resumeImprover');
const { authenticateUser } = require('../middleware/authMiddleware');
const { checkUsageLimit, incrementUsage } = require('../middleware/usageLimits');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Rate limiting for resume uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many resume uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for analysis requests
const analysisRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per minute
  message: {
    success: false,
    message: 'Too many analysis requests, please wait a moment.'
  }
});

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Routes
router.post('/upload',
  uploadRateLimit,
  checkUsageLimit('resumeAnalysis'), // Check quota BEFORE upload
  upload.single('resume'),
  uploadAndAnalyzeResume,
  incrementUsage // Increment AFTER successful upload
);

router.get('/history', getResumeHistory);

router.get('/analytics', getAnalytics);

router.get('/:resumeId', getResumeAnalysis);

router.delete('/:resumeId', deleteResume);

// Resume improvement routes
router.post('/:resumeId/improve',
  checkUsageLimit('resumeImprovement'),
  improveResume,
  incrementUsage
);

router.get('/:resumeId/improvement', getImprovementStatus);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
        errorCode: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed.',
        errorCode: 'TOO_MANY_FILES'
      });
    }
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only PDF files are allowed.',
      errorCode: 'INVALID_FILE_TYPE'
    });
  }
  
  next(error);
});

module.exports = router;