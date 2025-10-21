/**
 * Manual Data Sync Script
 *
 * Run this script to manually sync data to BigQuery:
 * node src/scripts/syncDataToBigQuery.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dataSyncService = require('../services/dataSyncService');

async function main() {
  try {
    console.log('🚀 Starting manual data sync to BigQuery...\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Run full sync
    const result = await dataSyncService.fullSync();

    console.log('\n📊 Sync Summary:');
    console.log('================');
    console.log(`User Activities: ${result.results.userActivities}`);
    console.log(`ATS Scores: ${result.results.atsScores}`);
    console.log(`Skills Trends: ${result.results.skillsTrends}`);
    console.log(`ROI Metrics: ${result.results.roiMetrics}`);
    console.log(`Resource Engagement: ${result.results.resourceEngagement}`);
    console.log(`Roadmap Progress: ${result.results.roadmapProgress}`);
    console.log(`Mock Interview Performance: ${result.results.mockInterviewPerformance}`);
    console.log(`\nDuration: ${result.duration}`);

    console.log('\n🎉 Data sync completed successfully!');
    console.log('\n🔗 Next steps:');
    console.log('   1. Go to BigQuery console: https://console.cloud.google.com/bigquery?project=careercraftai-475216');
    console.log('   2. Explore the career_insights dataset');
    console.log('   3. Run sample queries to verify data');
    console.log('   4. Connect to Looker Studio for visualizations');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

main();
