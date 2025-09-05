const express = require('express');
const router = express.Router();
const { localCleanupService } = require('../services/localStorageCleanup');

// Get cleanup service status
router.get('/status', (req, res) => {
  try {
    const status = localCleanupService.getStatus();
    res.status(200).json({
      success: true,
      data: status,
      message: 'Cleanup service status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cleanup status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get cleanup service status'
    });
  }
});

// Trigger manual cleanup (admin only - add auth middleware if needed)
router.post('/trigger', async (req, res) => {
  try {
    console.log('🔧 Manual cleanup triggered via API');
    const result = await localCleanupService.triggerManualCleanup();
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Cleanup completed: ${result.deletedFiles} files deleted`
    });
  } catch (error) {
    console.error('Error triggering manual cleanup:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to trigger cleanup'
    });
  }
});

// Get cleanup logs (last 10 entries)
router.get('/logs', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'logs', 'cleanup.log');
    
    if (!fs.existsSync(logFile)) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No cleanup logs found'
      });
    }

    const logs = fs.readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .slice(-10) // Get last 10 entries
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      })
      .reverse(); // Most recent first

    res.status(200).json({
      success: true,
      data: logs,
      message: 'Cleanup logs retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cleanup logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get cleanup logs'
    });
  }
});

module.exports = router;