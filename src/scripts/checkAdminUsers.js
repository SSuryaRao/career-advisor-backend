const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkAdminUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/career-advisor');
    console.log('✅ Connected to MongoDB');

    const users = await User.find({}).select('email isAdmin adminRole');

    console.log('\n📊 All users in database:');
    console.log('═'.repeat(80));

    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      users.forEach(user => {
        const adminStatus = user.isAdmin ? '✅ ADMIN' : '❌ Regular User';
        const role = user.adminRole ? `(${user.adminRole})` : '';
        console.log(`${adminStatus} - ${user.email} ${role}`);
      });
    }

    console.log('═'.repeat(80));
    console.log(`\nTotal users: ${users.length}`);
    console.log(`Admin users: ${users.filter(u => u.isAdmin).length}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAdminUsers();
