const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Resume = require('../models/Resume');
const firebaseStorage = require('../services/firebaseStorage');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const migrateResumeToFirebaseStorage = async () => {
  await connectDB();

  try {
    // Find all resumes that don't have Firebase URLs yet
    const resumesWithLocalFiles = await Resume.find({
      isActive: true,
      $or: [
        { fileUrl: { $regex: '^/uploads/resumes/' } },
        { firebaseUrl: { $exists: false } }
      ]
    });

    console.log(`Found ${resumesWithLocalFiles.length} resumes to migrate`);

    for (const resume of resumesWithLocalFiles) {
      try {
        const localFilePath = resume.fileUrl ? 
          path.join(__dirname, '../..', resume.fileUrl) : 
          path.join(__dirname, '../../uploads/resumes', resume.filename);
        
        // Check if local file exists
        try {
          await fs.access(localFilePath);
        } catch (error) {
          console.log(`❌ Local file not found: ${resume.filename}, skipping`);
          continue;
        }

        // Read the file
        const fileBuffer = await fs.readFile(localFilePath);
        
        // Upload to Firebase Storage
        const uploadResult = await firebaseStorage.uploadResume(
          fileBuffer,
          resume.originalName,
          resume.userId
        );

        // Update the resume record
        await Resume.findByIdAndUpdate(resume._id, {
          $set: {
            firebaseUrl: uploadResult.firebaseUrl,
            firebaseStoragePath: uploadResult.firebaseStoragePath,
            filename: uploadResult.filename
          },
          $unset: {
            fileUrl: 1
          }
        });

        console.log(`✅ Migrated: ${resume.originalName}`);

        // Optional: Delete local file after successful migration
        // await fs.unlink(localFilePath);

      } catch (error) {
        console.error(`❌ Failed to migrate ${resume.filename}:`, error.message);
      }
    }

    console.log('✅ Migration completed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  migrateResumeToFirebaseStorage();
}

module.exports = migrateResumeToFirebaseStorage;