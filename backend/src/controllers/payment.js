const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Resume = require('../models/Resume');
const User = require('../models/User');

// @desc    Create Stripe Checkout Session
// @route   POST /api/payment/create-checkout-session
// @access  Public
exports.createCheckoutSession = async (req, res) => {
    try {
        const { planType } = req.body; // 'pro'

        // Simulating session creation for now if key is invalid/placeholder
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
            const origin = req.headers.origin || 'http://localhost:5333';
            const returnUrl = req.body.returnUrl || `${origin}/dashboard.html`;
            const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}session_id=mock_session`;

            return res.status(200).json({
                id: 'cs_test_mock_session_id',
                url: redirectUrl,
                message: 'Mock session created (No valid Stripe Key)'
            });
        }



        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'CareerForge Pro Subscription',
                            description: 'Unlimited Resumes, Cover Letters, Premium Templates',
                        },
                        unit_amount: 1900, // $19.00
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            client_reference_id: req.user ? req.user.id : null, // Track user
            success_url: `${req.headers.origin || 'http://localhost:5173'}/index.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'http://localhost:5173'}/index.html?payment=cancelled`,
        });

        res.status(200).json({ id: session.id, url: session.url });
    } catch (err) {
        console.error('Stripe Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Stripe Webhook Handler
// @route   POST /api/payment/webhook
// @access  Public (Called by Stripe)
exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook Signature Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;

        if (userId) {
            await User.findByIdAndUpdate(userId, { isPro: true });
            console.log(`User ${userId} upgraded to Pro via Webhook`);
        }
    }

    res.json({ received: true });
};

// @desc    Client-side Success Verification (Fallback/Final Sync)
// @route   POST /api/payment/success
// @access  Private
exports.handlePaymentSuccess = async (req, res) => {
    try {
        const { session_id } = req.body;

        // In a real production app, we would verify the session status again here
        // But the webhook is the primary source of truth.
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.status(200).json({
            success: true,
            isPro: user.isPro,
            message: user.isPro ? 'Pro access active!' : 'Payment processing...'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to sync status' });
    }
};

