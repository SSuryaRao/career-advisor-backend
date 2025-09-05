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
const progressRoutes = require('./routes/progressRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const roadmapProgressRoutes = require('./routes/roadmapProgressRoutes');
const cleanupRoutes = require('./routes/cleanupRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const { startJobSync } = require('./services/jobSyncService');
const { localCleanupService } = require('./services/localStorageCleanup');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
initializeFirebase();

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use(helmet());
app.use(morgan('combined'));
app.use(limiter);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://career-craft-ai-three.vercel.app/'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (with authentication for security)
app.use('/uploads', express.static('uploads'));

app.use('/api/jobs', jobRoutes);
app.use('/api/user', userRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/roadmap-progress', roadmapProgressRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/internships', internshipRoutes);

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
  
  if (process.env.NODE_ENV !== 'test') {
    // Start job synchronization service
    startJobSync();
    
    // Start local storage cleanup service
    // This only affects LOCAL files, cloud storage is never touched
    localCleanupService.startScheduledCleanup();
  }
});