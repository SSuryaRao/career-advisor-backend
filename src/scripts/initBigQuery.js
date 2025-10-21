/**
 * Initialize BigQuery Dataset and Tables
 *
 * Run this script once to set up the BigQuery infrastructure:
 * node src/scripts/initBigQuery.js
 */

const bigQueryService = require('../services/bigQueryService');

async function main() {
  try {
    console.log('🚀 Starting BigQuery initialization...\n');

    // Test connection first
    await bigQueryService.testConnection();
    console.log('');

    // Initialize dataset and tables
    await bigQueryService.initialize();
    console.log('');

    console.log('🎉 BigQuery initialization completed successfully!');
    console.log('');
    console.log('📊 Dataset: career_insights');
    console.log('📍 Location: US');
    console.log('');
    console.log('✅ Tables created:');
    console.log('   - user_activities');
    console.log('   - ats_scores');
    console.log('   - skills_trends');
    console.log('   - roi_metrics');
    console.log('   - scholarship_applications');
    console.log('   - resource_engagement');
    console.log('   - roadmap_progress');
    console.log('   - mock_interview_performance');
    console.log('');
    console.log('🔗 Next steps:');
    console.log('   1. Run data sync: node src/scripts/syncDataToBigQuery.js');
    console.log('   2. Connect to Looker Studio for visualizations');
    console.log('   3. Access dashboard at /admin/insights');

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
