# Local Storage Cleanup Service 🧹

## Overview
The Local Storage Cleanup Service automatically manages local file storage to prevent disk space issues. It **ONLY** affects local files and **NEVER** touches cloud storage (Firebase).

## Features
- ⏰ **Scheduled Cleanup**: Runs daily at 2:00 AM UTC
- 🕐 **24-hour Retention**: Files older than 24 hours are automatically deleted
- 🔒 **Local Only**: Cloud storage files are completely protected
- 📊 **Detailed Logging**: Full cleanup statistics and monitoring
- 🔧 **Manual Triggers**: Admin can trigger cleanup on demand
- 📈 **Status Monitoring**: Real-time service status and configuration

## Protected Directories
The cleanup service monitors these local directories only:
- `uploads/` - General file uploads
- `uploads/resumes/` - Resume uploads (PDFs)  
- `uploads/profiles/` - Profile image uploads
- `temp/` - Temporary processing files

## API Endpoints

### Get Service Status
```bash
GET /api/cleanup/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "cleanupIntervalHours": 24,
    "nextCleanupTime": "Daily at 2:00 AM UTC",
    "targetDirectories": [
      "uploads/",
      "uploads/resumes/", 
      "uploads/profiles/",
      "temp/"
    ]
  }
}
```

### Trigger Manual Cleanup
```bash
POST /api/cleanup/trigger
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 15,
    "deletedFiles": 3,
    "errors": 0,
    "directories": [...]
  },
  "message": "Cleanup completed: 3 files deleted"
}
```

### Get Cleanup Logs
```bash
GET /api/cleanup/logs
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T02:00:00.000Z",
      "duration": "1.23s",
      "totalFiles": 15,
      "deletedFiles": 3,
      "errors": 0,
      "directories": [...]
    }
  ]
}
```

## How It Works

### 1. Scheduled Operation
- Service starts automatically with the server
- Runs initial cleanup check 5 seconds after server start
- Schedules daily cleanup at 2:00 AM UTC using cron

### 2. File Age Detection
```javascript
// Files are deleted if creation time + 24 hours < current time
const fileAgeMs = Date.now() - stats.mtime.getTime();
const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
return fileAgeMs > maxAgeMs;
```

### 3. Safety Measures
- **Cloud Protection**: Only local directories are processed
- **Directory Validation**: Checks if directories exist before processing
- **File Type Filtering**: Only processes regular files (skips directories)
- **Error Handling**: Continues processing even if individual files fail
- **Detailed Logging**: All operations are logged for monitoring

### 4. Logging System
- Logs stored in `logs/cleanup.log`
- JSON format for easy parsing
- Includes timing, file counts, and error details
- Accessible via API endpoint

## Configuration

### Environment Variables
All configuration is currently hardcoded but can be made configurable:

```javascript
// In localStorageCleanup.js
this.cleanupIntervalHours = 24; // Files older than this are deleted
```

### Cron Schedule
```javascript
// Runs daily at 2:00 AM UTC
cron.schedule('0 2 * * *', async () => {
  await this.performCleanup();
});
```

## Monitoring

### Console Output
```
🚀 Starting local storage cleanup service...
⏰ Scheduled to run daily at 2:00 AM
🕐 Files older than 24 hours will be deleted
☁️  Cloud storage files are NEVER affected
✅ Local storage cleanup service started successfully

🧹 Starting local storage cleanup...
🔍 Cleaning General uploads (/path/to/uploads)...
✨ Cleaned 2 files from General uploads
🔍 Cleaning Resume uploads (/path/to/uploads/resumes)...
✨ Cleaned 1 files from Resume uploads
🏁 Cleanup completed in 0.45s
📊 Summary: 3 files deleted, 0 errors
```

### Log File Format
```json
{
  "timestamp": "2024-01-15T02:00:00.000Z",
  "duration": "0.45s",
  "totalFiles": 10,
  "deletedFiles": 3,
  "errors": 0,
  "directories": [
    {
      "path": "/path/to/uploads",
      "description": "General uploads",
      "totalFiles": 5,
      "deletedFiles": 2,
      "errors": 0
    }
  ]
}
```

## Important Notes

### ⚠️ Critical Safety Information
1. **Cloud Storage Protection**: This service NEVER interacts with Firebase/cloud storage
2. **Local Only**: Only affects files in the local `uploads/` directory structure
3. **24-hour Grace Period**: Files are safe for 24 hours after creation
4. **Non-Destructive**: Cloud backups and primary storage remain intact

### 📋 Best Practices
1. Monitor cleanup logs regularly
2. Ensure adequate disk space for 24-hour retention
3. Test manual cleanup in development
4. Review cleanup statistics for usage patterns

### 🔧 Troubleshooting
- Check `logs/cleanup.log` for detailed operation history
- Use `/api/cleanup/status` to verify service is running
- Use `/api/cleanup/trigger` to test manual cleanup
- Monitor console output during server startup

## Integration with Existing Services

### Local Storage Service
The cleanup service works alongside the existing `localStorage.js`:
- LocalStorageService creates files in `uploads/resumes/`
- CleanupService automatically removes old files after 24 hours
- No conflicts or interference between services

### Firebase Storage Service  
The cleanup service has **zero interaction** with `firebaseStorage.js`:
- Cloud files remain permanently stored
- No cleanup or deletion of cloud resources
- Complete separation of local and cloud storage

This ensures that your production files in Firebase are always safe while local temporary files are efficiently managed.