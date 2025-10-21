/**
 * Make User Admin Script
 *
 * Usage: node src/scripts/makeUserAdmin.js your@email.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function makeUserAdmin(email) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    console.log(`🔍 Looking for user: ${email}...`);
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      console.log('\n💡 Make sure the user has signed up first!');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Check if already admin
    if (user.isAdmin) {
      console.log(`ℹ️  User "${email}" is already an admin!`);
      console.log(`   Role: ${user.adminRole || 'admin'}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Make admin
    user.isAdmin = true;
    user.adminRole = 'super-admin';
    await user.save();

    console.log('✅ SUCCESS! User is now an admin!\n');
    console.log('📋 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`   Role: ${user.adminRole}`);
    console.log('\n🎉 The user can now access /admin/insights');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('❌ Error: Email is required\n');
  console.log('Usage: node src/scripts/makeUserAdmin.js your@email.com');
  console.log('\nExample:');
  console.log('  node src/scripts/makeUserAdmin.js admin@example.com');
  process.exit(1);
}

makeUserAdmin(email);
