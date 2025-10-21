const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const dialogflowWebhook = require('../controllers/dialogflowWebhook');
const { optionalAuth } = require('../middleware/authMiddleware');

// Send message to chatbot (with optional authentication)
router.post('/message', optionalAuth, chatbotController.sendMessage.bind(chatbotController));

// Health check for chatbot service
router.get('/health', chatbotController.getHealthCheck.bind(chatbotController));

// Dialogflow CX webhook endpoint (no auth required - secured by Dialogflow)
router.post('/webhook', dialogflowWebhook.handleWebhook.bind(dialogflowWebhook));

module.exports = router;