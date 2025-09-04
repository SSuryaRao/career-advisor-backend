const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':****@'));
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB connection successful!');
    
    // Test a simple operation
    const testCollection = mongoose.connection.db.collection('test');
    await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
    console.log('✅ Database write test successful!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

testConnection();