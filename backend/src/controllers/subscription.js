const {
    createCheckoutSession,
    createPortalSession,
    handleWebhookEvent,
    verifyWebhookSignature
} = require('../services/stripeService');
const User = require('../models/User');

/**
 * STRIPE/SUBSCRIPTION CONTROLLER
 * Handles payment flows, webhooks, and subscription status
 */

// @desc    Create Stripe Checkout Session
// @route   POST /api/subscription/create-checkout
// @access  Private
exports.createCheckout = async (req, res) => {
    try {
        const { priceType } = req.body; // 'monthly' or 'yearly'
        const user = req.user;

        // Check if already Pro
        if (user.isPro()) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active Pro subscription'
            });
        }

        const session = await createCheckoutSession(user, priceType || 'monthly');

        res.status(200).json({
            success: true,
            data: {
                sessionId: session.id,
                url: session.url
            }
        });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).json({
            success: false,
            message: `Failed to create checkout session: ${err.message}`
        });
    }
};

// @desc    Create Stripe Customer Portal Session
// @route   POST /api/subscription/portal
// @access  Private
exports.createPortal = async (req, res) => {
    try {
        const session = await createPortalSession(req.user);

        res.status(200).json({
            success: true,
            data: {
                url: session.url
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get current subscription status
// @route   GET /api/subscription/status
// @access  Private
exports.getSubscriptionStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                plan: user.subscription.plan,
                status: user.subscription.status,
                currentPeriodEnd: user.subscription.currentPeriodEnd,
                cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
                isPro: user.isPro(),
                resumeCount: user.resumeCount,
                resumeLimit: user.isPro() ? 'unlimited' : 1
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Stripe Webhook Handler
// @route   POST /api/subscription/webhook
// @access  Public (verified by Stripe signature)
exports.handleWebhook = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            event = verifyWebhookSignature(req.body, sig);
        } catch (err) {
            console.error('⚠️ Webhook signature verification failed:', err.message);
            return res.status(400).json({ message: `Webhook Error: ${err.message}` });
        }

        // Process the event
        await handleWebhookEvent(event);

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).json({ message: err.message });
    }
};
