const { MongoClient } = require('mongodb');

const uri = 'mongodb://career_advisor:career1234@ac-7qcy7ng-shard-00-00.qns9uj3.mongodb.net:27017,ac-7qcy7ng-shard-00-01.qns9uj3.mongodb.net:27017,ac-7qcy7ng-shard-00-02.qns9uj3.mongodb.net:27017/?ssl=true&replicaSet=atlas-ndrq0z-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function migrateData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const sourceDb = client.db('test');
    const targetDb = client.db('career-advisor');

    // Get all collections from test database
    const collections = await sourceDb.listCollections().toArray();

    console.log('📦 Collections to migrate from "test" database:');
    collections.forEach(c => console.log(`  - ${c.name}`));
    console.log();

    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;

      console.log(`🔄 Migrating ${collectionName}...`);

      const sourceCollection = sourceDb.collection(collectionName);
      const targetCollection = targetDb.collection(collectionName);

      // Get all documents
      const documents = await sourceCollection.find({}).toArray();

      if (documents.length === 0) {
        console.log(`  ⏭️  Skipped (empty collection)\n`);
        continue;
      }

      // Check if target collection already has data
      const existingCount = await targetCollection.countDocuments();

      if (existingCount > 0 && collectionName === 'scholarships') {
        console.log(`  ⚠️  Target already has ${existingCount} scholarships`);
        console.log(`  📊 Source has ${documents.length} scholarships`);
        console.log(`  💡 Merging both (using upsert to avoid duplicates)...\n`);

        // For scholarships, upsert to merge without duplicates
        let inserted = 0;
        let updated = 0;

        for (const doc of documents) {
          const result = await targetCollection.updateOne(
            { title: doc.title, provider: doc.provider },
            { $set: doc },
            { upsert: true }
          );

          if (result.upsertedCount > 0) inserted++;
          if (result.modifiedCount > 0) updated++;
        }

        console.log(`  ✅ Merged: ${inserted} new, ${updated} updated\n`);

      } else if (existingCount > 0) {
        console.log(`  ⚠️  Collection already exists in target with ${existingCount} documents`);
        console.log(`  ❓ Do you want to merge? (This script will skip for safety)`);
        console.log(`  💡 Manual action needed for: ${collectionName}\n`);

      } else {
        // Target is empty, safe to copy all
        await targetCollection.insertMany(documents);
        console.log(`  ✅ Copied ${documents.length} documents\n`);
      }
    }

    // Show final stats
    console.log('\n📊 Migration Summary:');
    console.log('─────────────────────────────────────');

    const finalCollections = await targetDb.listCollections().toArray();

    for (const coll of finalCollections) {
      const count = await targetDb.collection(coll.name).countDocuments();
      console.log(`  ${coll.name}: ${count} documents`);
    }

    console.log('─────────────────────────────────────');
    console.log('\n✅ Migration completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. Verify data in career-advisor database');
    console.log('  2. Backend is already configured to use career-advisor');
    console.log('  3. Restart your backend server');
    console.log('  4. Test the API: curl http://localhost:5000/api/scholarships');
    console.log('\n⚠️  Old data in "test" database is still there (not deleted)');
    console.log('   You can delete it later after confirming everything works.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

console.log('🚀 Starting data migration from "test" → "career-advisor"\n');
migrateData();
