const { MongoClient } = require('mongodb');

// Connection string WITHOUT database name (your original)
const oldUri = 'mongodb://career_advisor:career1234@ac-7qcy7ng-shard-00-00.qns9uj3.mongodb.net:27017,ac-7qcy7ng-shard-00-01.qns9uj3.mongodb.net:27017,ac-7qcy7ng-shard-00-02.qns9uj3.mongodb.net:27017/?ssl=true&replicaSet=atlas-ndrq0z-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function checkDatabases() {
  const client = new MongoClient(oldUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    console.log('\n📊 All databases on this cluster:');
    databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Check each database for scholarships collection
    console.log('\n🔍 Checking for scholarships in each database:');
    for (const dbInfo of databases) {
      if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') continue;

      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();

      if (collections.some(c => c.name === 'scholarships')) {
        const count = await db.collection('scholarships').countDocuments();
        console.log(`  ✅ ${dbInfo.name}: ${count} scholarships`);
      }
    }

    // Check for users collection (important data!)
    console.log('\n👥 Checking for user data:');
    for (const dbInfo of databases) {
      if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') continue;

      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();

      if (collections.some(c => c.name === 'users')) {
        const count = await db.collection('users').countDocuments();
        console.log(`  ✅ ${dbInfo.name}: ${count} users`);
      }

      if (collections.some(c => c.name === 'resumes')) {
        const count = await db.collection('resumes').countDocuments();
        console.log(`  ✅ ${dbInfo.name}: ${count} resumes`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkDatabases();
