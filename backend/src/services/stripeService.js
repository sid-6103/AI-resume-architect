const Stripe = require('stripe');
const User = require('../models/User');

/**
 * STRIPE SERVICE
 * Handles subscription management, checkout sessions, and webhooks
 * 
 * Subscription Tiers:
 * - Free: 1 resume, basic templates
 * - Pro:  Unlimited resumes, premium templates, cover letters, priority PDF
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Price IDs (set these in .env or use Stripe Dashboard)
const PRICE_IDS = {
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly'
};

/**
 * Create or retrieve Stripe customer for a user
 */
const getOrCreateCustomer = async (user) => {
    if (user.subscription.stripeCustomerId) {
        return user.subscription.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
            userId: user._id.toString()
        }
    });

    user.subscription.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
};

/**
 * Create Stripe Checkout Session for Pro subscription
 */
const createCheckoutSession = async (user, priceType = 'monthly') => {
    const customerId = await getOrCreateCustomer(user);
    const priceId = priceType === 'yearly' ? PRICE_IDS.pro_yearly : PRICE_IDS.pro_monthly;

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
            price: priceId,
            quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?canceled=true`,
        metadata: {
            userId: user._id.toString()
        },
        subscription_data: {
            metadata: {
                userId: user._id.toString()
            }
        }
    });

    return session;
};

/**
 * Create Customer Portal session for managing subscription
 */
const createPortalSession = async (user) => {
    const customerId = await getOrCreateCustomer(user);

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
    });

    return session;
};

/**
 * Handle Stripe webhook events
 */
const handleWebhookEvent = async (event) => {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            await handleCheckoutComplete(session);
            break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            await handleSubscriptionUpdate(subscription);
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            await handleSubscriptionCanceled(subscription);
            break;
        }

        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            await handlePaymentSucceeded(invoice);
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            await handlePaymentFailed(invoice);
            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
};

/**
 * Handle successful checkout
 */
const handleCheckoutComplete = async (session) => {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const user = await User.findById(userId);
    if (!user) return;

    user.subscription.stripeCustomerId = session.customer;
    user.subscription.stripeSubscriptionId = session.subscription;
    user.subscription.plan = 'pro';
    user.subscription.status = 'active';
    await user.save();

    console.log(`✅ User ${user.email} upgraded to Pro`);
};

/**
 * Handle subscription updates
 */
const handleSubscriptionUpdate = async (subscription) => {
    const userId = subscription.metadata?.userId;
    if (!userId) {
        // Try finding by customer ID
        const user = await User.findOne({
            'subscription.stripeCustomerId': subscription.customer
        });
        if (user) {
            updateUserSubscription(user, subscription);
        }
        return;
    }

    const user = await User.findById(userId);
    if (user) {
        updateUserSubscription(user, subscription);
    }
};

/**
 * Update user subscription details
 */
const updateUserSubscription = async (user, subscription) => {
    user.subscription.stripeSubscriptionId = subscription.id;
    user.subscription.stripePriceId = subscription.items.data[0]?.price.id;
    user.subscription.status = subscription.status;
    user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;

    if (subscription.status === 'active' || subscription.status === 'trialing') {
        user.subscription.plan = 'pro';
    }

    await user.save();
    console.log(`📋 Subscription updated for ${user.email}: ${subscription.status}`);
};

/**
 * Handle subscription cancellation
 */
const handleSubscriptionCanceled = async (subscription) => {
    const user = await User.findOne({
        'subscription.stripeSubscriptionId': subscription.id
    });

    if (user) {
        user.subscription.status = 'canceled';
        user.subscription.plan = 'free';
        await user.save();
        console.log(`❌ Subscription canceled for ${user.email}`);
    }
};

/**
 * Handle successful payment
 */
const handlePaymentSucceeded = async (invoice) => {
    console.log(`💰 Payment succeeded for invoice ${invoice.id}`);
};

/**
 * Handle failed payment
 */
const handlePaymentFailed = async (invoice) => {
    const user = await User.findOne({
        'subscription.stripeCustomerId': invoice.customer
    });

    if (user) {
        user.subscription.status = 'past_due';
        await user.save();
        console.log(`⚠️ Payment failed for ${user.email}`);
    }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, sig) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set. Skipping signature verification.');
        return JSON.parse(payload);
    }

    return stripe.webhooks.constructEvent(payload, sig, webhookSecret);
};

module.exports = {
    stripe,
    createCheckoutSession,
    createPortalSession,
    handleWebhookEvent,
    verifyWebhookSignature,
    getOrCreateCustomer
};
