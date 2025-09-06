// Dialogflow CX routes commented out for deployment - will implement later
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Send message to chatbot
router.post('/message', chatbotController.sendMessage.bind(chatbotController));

// Health check for chatbot service
router.get('/health', chatbotController.getHealthCheck.bind(chatbotController));

module.exports = router;