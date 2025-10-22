const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const { initializeFirebase } = require('./config/firebase');
const jobRoutes = require('./routes/jobRoutes');
const userRoutes = require('./routes/userRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const resumeBuilderRoutes = require('./routes/resumeBuilderRoutes');
const progressRoutes = require('./routes/progressRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const roadmapProgressRoutes = require('./routes/roadmapProgressRoutes');
const roadmapRoutes2 = require('./routes/roadmapRoutes2');
const mockInterviewRoutes = require('./routes/mockInterviewRoutes');
const intelligentInterviewRoutes = require('./routes/intelligentInterviewRoutes');
console.log('📍 Loading recommendation routes...');
const recommendationRoutes = require('./routes/recommendationRoutes');
console.log('📍 Recommendation routes loaded:', typeof recommendationRoutes);
const mentorRoutes = require('./routes/mentorRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const cleanupRoutes = require('./routes/cleanupRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const testRoutes = require('./routes/testRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { startJobSync } = require('./services/jobSyncService');
const { localCleanupService } = require('./services/localStorageCleanup');
const dataSyncService = require('./services/dataSyncService');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
initializeFirebase();

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased from 100 to 500
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting for health checks and development
    return req.path === '/api/health' || process.env.NODE_ENV === 'development'
  }
});

app.use(helmet());
app.use(morgan('combined'));
app.use(limiter);
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://career-craft-ai-three.vercel.app',
        'https://career-advisor-backend-y6sr.onrender.com',
        'https://careercraft-frontend-1030709276859.us-central1.run.app',
        'https://careercraft-backend-1030709276859.us-central1.run.app'
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (with authentication for security)
app.use('/uploads', express.static('uploads'));

app.use('/api/jobs', jobRoutes);
app.use('/api/user', userRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/resume-builder', resumeBuilderRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/roadmap-progress', roadmapProgressRoutes);
app.use('/api/roadmaps', roadmapRoutes2);
app.use('/api/mock-interview', mockInterviewRoutes);
app.use('/api/intelligent-interview', intelligentInterviewRoutes);
console.log('📍 Registering recommendation routes...');
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/test', testRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Career Advisor API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.originalUrl} does not exist.`
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Force restart to pick up new routes
  if (process.env.NODE_ENV !== 'test') {
    // Start job synchronization service
    startJobSync();

    // Start local storage cleanup service
    // This only affects LOCAL files, cloud storage is never touched
    localCleanupService.startScheduledCleanup();

    // Initialize BigQuery data sync cron jobs
    dataSyncService.initializeCronJobs();
  }
});