const express = require('express');
const { createCheckoutSession, handlePaymentSuccess, stripeWebhook } = require('../controllers/payment');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/success', protect, handlePaymentSuccess);
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;

