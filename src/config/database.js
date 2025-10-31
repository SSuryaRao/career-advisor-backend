const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Performance optimization settings for Cloud Run
      serverSelectionTimeoutMS: 30000, // Timeout for initial server selection (30 seconds) - increased for Cloud Run cold starts
      socketTimeoutMS: 45000, // Timeout for socket inactivity (45 seconds)
      connectTimeoutMS: 30000, // Timeout for initial connection (30 seconds) - increased for Cloud Run
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections to maintain
      maxIdleTimeMS: 30000, // Close connections idle for more than 30 seconds
      // Retry settings
      retryWrites: true,
      retryReads: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Set default query timeout for all queries
    mongoose.set('maxTimeMS', 10000); // 10 second max for any query

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;