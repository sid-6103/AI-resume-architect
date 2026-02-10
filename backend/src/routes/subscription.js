const express = require('express');
const {
    createCheckout,
    createPortal,
    getSubscriptionStatus,
    handleWebhook
} = require('../controllers/subscription');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Webhook must use raw body parser (configured in server.js)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-checkout', protect, createCheckout);
router.post('/portal', protect, createPortal);
router.get('/status', protect, getSubscriptionStatus);

module.exports = router;
