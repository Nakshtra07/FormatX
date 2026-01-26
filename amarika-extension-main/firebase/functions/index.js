// Firebase Cloud Functions for Amarika Razorpay Integration
// Deploy with: firebase deploy --only functions
// Last updated: 2026-01-26 04:58

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

setGlobalOptions({ region: 'asia-south1', invoker: 'public' });
const Razorpay = require('razorpay');

// Initialize generic services
admin.initializeApp();
const db = admin.firestore();

// Lazy load Razorpay to prevent cold start issues
let razorpayInstance = null;
function getRazorpay() {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: 'rzp_test_S8HiwAEAf9UPdp',
            key_secret: '5tBpAbOnruP4y1KOljctJOF1'
        });
    }
    return razorpayInstance;
}

// Webhook secret for signature verification
const webhookSecret = 'amarika_webhook_secret';

// Plan IDs (Test Mode)
const PLAN_IDS = {
    'plan_S8HkUbeANDtrsP': 'pro',  // Pro Monthly
    'plan_S8Hm0hBBAVpqxw': 'pro'   // Pro Annual
};

/**
 * Create a Razorpay Subscription
 * Returns the hosted checkout URL (short_url)
 */
exports.createSubscription = onRequest({ cors: true }, async (req, res) => {
    // Enable CORS manually as a fallback
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }

    try {
        console.log('Request received in createSubscription');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Body type:', typeof req.body);
        console.log('Body keys:', req.body ? Object.keys(req.body) : 'null');

        // Initialize data
        let data = null;

        // Strategy 1: req.body is already parsed object
        if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
            console.log('Using req.body directly');
            data = req.body;
        }
        // Strategy 2: req.body is a string (needs parsing)
        else if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
            console.log('Parsing req.body string');
            try {
                data = JSON.parse(req.body);
            } catch (e) {
                console.error('req.body string parse failed:', e.message);
            }
        }
        // Strategy 3: Use rawBody
        else if (req.rawBody) {
            const rawStr = req.rawBody.toString('utf8');
            console.log('Using rawBody, length:', rawStr.length);
            console.log('rawBody preview:', rawStr.substring(0, 100));

            // Clean the string - remove any BOM or weird characters
            const cleanStr = rawStr.trim().replace(/^\uFEFF/, '');

            if (cleanStr.startsWith('{')) {
                try {
                    data = JSON.parse(cleanStr);
                    console.log('rawBody parsed successfully');
                } catch (e) {
                    console.error('rawBody parse failed:', e.message);
                    console.error('rawBody first 50 chars:', cleanStr.substring(0, 50));
                }
            } else {
                console.error('rawBody does not start with {:', cleanStr.substring(0, 20));
            }
        }

        console.log('Final parsed data:', JSON.stringify(data));

        const { planId, userId, email, displayName } = data || {};

        if (!planId || !userId || !email) {
            console.error('Missing required fields');
            res.status(400).json({ error: 'Missing required fields: planId, userId, email' });
            return;
        }

        // Initialize Razorpay
        const razorpay = getRazorpay();

        // Check if customer exists in Firestore
        let customerId;
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().razorpayCustomerId) {
                const storedCustomerId = userDoc.data().razorpayCustomerId;

                // Verify customer exists in Razorpay (handles Live/Test mode switches)
                try {
                    await razorpay.customers.fetch(storedCustomerId);
                    customerId = storedCustomerId;
                    console.log('Using existing customer:', customerId);
                } catch (fetchError) {
                    console.log('Stored customer not found in Razorpay (mode switch?), will create new');
                    customerId = null;
                }
            }
        } catch (dbError) {
            console.error('Firestore error:', dbError);
        }

        // Create new customer if needed
        if (!customerId) {
            try {
                console.log('Creating new Razorpay customer');
                const customer = await razorpay.customers.create({
                    name: displayName || email.split('@')[0],
                    email: email,
                    notes: { userId }
                });
                customerId = customer.id;

                // Save customer ID
                await db.collection('users').doc(userId).set({
                    razorpayCustomerId: customerId
                }, { merge: true }).catch(e => console.error('Failed to save customerId to DB', e));
            } catch (rzpError) {
                console.error('Razorpay customer creation failed:', rzpError);
                throw new Error('Failed to create payment customer: ' + rzpError.message);
            }
        }

        console.log('Creating subscription for customer:', customerId);

        // Create subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_id: customerId,
            quantity: 1,
            total_count: 12, // Default to 12 cycles
            customer_notify: 1,
            notes: { userId, email }
        });

        console.log('Subscription created:', subscription.id);
        console.log('Full subscription response:', JSON.stringify(subscription));

        // Save subscription ID
        await db.collection('users').doc(userId).set({
            subscription: {
                razorpaySubscriptionId: subscription.id,
                status: subscription.status,
                planId: planId
            }
        }, { merge: true }).catch(e => console.error('Failed to save sub to DB', e));

        // Determine the checkout URL
        // Razorpay sometimes returns API URL instead of hosted page in Test Mode
        let checkoutUrl = subscription.short_url;

        // If short_url looks like an API URL, construct the proper hosted checkout URL
        if (!checkoutUrl || checkoutUrl.includes('api.razorpay.com')) {
            // Fallback: Use Razorpay's standard subscription checkout page format
            checkoutUrl = `https://rzp.io/i/${subscription.id}`;
            console.log('Using fallback checkout URL:', checkoutUrl);
        }

        // Response
        res.json({
            subscriptionId: subscription.id,
            url: checkoutUrl,
            status: subscription.status
        });

    } catch (error) {
        console.error('CRITICAL ERROR in createSubscription:', error);
        // Ensure we send a JSON response even for crashes
        res.status(500).json({
            error: error.message || 'Internal Server Error',
            details: error.toString()
        });
    }
});

/**
 * Razorpay Webhook Handler
 * Handles subscription events
 */
exports.razorpayWebhook = onRequest({ cors: true }, async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    if (webhookSecret && signature) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('Webhook signature verification failed');
            res.status(400).send('Invalid signature');
            return;
        }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log('Received Razorpay event:', event);

    try {
        switch (event) {
            case 'subscription.activated':
                await handleSubscriptionActivated(payload.subscription.entity);
                break;

            case 'subscription.charged':
                await handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
                break;

            case 'subscription.cancelled':
                await handleSubscriptionCancelled(payload.subscription.entity);
                break;

            case 'subscription.paused':
                await handleSubscriptionPaused(payload.subscription.entity);
                break;

            case 'payment.failed':
                await handlePaymentFailed(payload.payment.entity);
                break;

            default:
                console.log(`Unhandled event type: ${event}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Handle subscription activated (first successful payment)
 */
async function handleSubscriptionActivated(subscription) {
    const userId = subscription.notes?.userId;
    if (!userId) {
        console.error('No userId in subscription notes');
        return;
    }

    const planId = subscription.plan_id;
    const tier = PLAN_IDS[planId] || 'pro';

    // Update user subscription in Firestore
    await db.collection('users').doc(userId).set({
        subscription: {
            tier,
            status: 'active',
            razorpaySubscriptionId: subscription.id,
            planId,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            currentStart: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
            currentEnd: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null
        }
    }, { merge: true });

    console.log(`User ${userId} subscription activated: ${tier}`);
}

/**
 * Handle subscription charged (recurring payment success)
 */
async function handleSubscriptionCharged(subscription, payment) {
    const userId = subscription.notes?.userId;
    if (!userId) return;

    const tier = PLAN_IDS[subscription.plan_id] || 'pro';

    await db.collection('users').doc(userId).set({
        subscription: {
            tier,
            status: 'active',
            currentEnd: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
            lastPaymentId: payment.id,
            lastPaymentAt: admin.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });

    console.log(`User ${userId} subscription renewed`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription) {
    const userId = subscription.notes?.userId;
    if (!userId) return;

    // Downgrade to free tier
    await db.collection('users').doc(userId).set({
        subscription: {
            tier: 'free',
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });

    console.log(`User ${userId} subscription cancelled, downgraded to free`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(subscription) {
    const userId = subscription.notes?.userId;
    if (!userId) return;

    await db.collection('users').doc(userId).set({
        subscription: {
            status: 'paused',
            pausedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });

    console.log(`User ${userId} subscription paused`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payment) {
    // Find user by subscription
    if (!payment.subscription_id) return;

    const usersSnapshot = await db.collection('users')
        .where('subscription.razorpaySubscriptionId', '==', payment.subscription_id)
        .limit(1)
        .get();

    if (usersSnapshot.empty) return;

    const userId = usersSnapshot.docs[0].id;

    await db.collection('users').doc(userId).set({
        subscription: {
            status: 'past_due',
            paymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            failedPaymentId: payment.id
        }
    }, { merge: true });

    console.log(`User ${userId} payment failed`);
}

/**
 * Cancel a subscription (can be called from extension)
 */
exports.cancelSubscription = onRequest({ cors: true }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { userId, subscriptionId } = req.body;

        if (!subscriptionId) {
            res.status(400).json({ error: 'Missing subscriptionId' });
            return;
        }

        // Cancel at end of current period
        const razorpay = getRazorpay();
        const cancelled = await razorpay.subscriptions.cancel(subscriptionId, false);

        if (userId) {
            await db.collection('users').doc(userId).set({
                subscription: {
                    status: 'pending_cancellation',
                    cancelRequestedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });
        }

        res.json({ success: true, subscription: cancelled });

    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});
