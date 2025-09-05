const mongoose = require('mongoose');
const Scholarship = require('../models/Scholarship');
const scholarshipsData = require('../data/scholarshipData');
require('dotenv').config();

async function seedScholarships() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing scholarships
    await Scholarship.deleteMany({});
    console.log('Cleared existing scholarship data');

    // Insert new scholarship data
    const insertedScholarships = await Scholarship.insertMany(scholarshipsData);
    console.log(`Successfully seeded ${insertedScholarships.length} scholarships`);

    // Display seeded data
    insertedScholarships.forEach((scholarship, index) => {
      console.log(`${index + 1}. ${scholarship.title} - ${scholarship.provider}`);
    });

  } catch (error) {
    console.error('Error seeding scholarships:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
if (require.main === module) {
  seedScholarships();
}

module.exports = seedScholarships;