const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    
    const uri = 'mongodb://career_advisor:career1234@ac-7qcy7ng-shard-00-00.qns9uj3.mongodb.net:27017,ac-7qcy7ng-shard-00-01.qns9uj3.mongodb.net:27017,ac-7qcy7ng-shard-00-02.qns9uj3.mongodb.net:27017/?ssl=true&replicaSet=atlas-ndrq0z-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connection successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();