// Firebase Cloud Functions for Amarika Stripe Integration
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');

admin.initializeApp();
const db = admin.firestore();

// Initialize Stripe with your secret key
// Set with: firebase functions:config:set stripe.secret_key="sk_live_..."
const stripeClient = stripe(functions.config().stripe.secret_key);

// Stripe webhook secret for signature verification
// Set with: firebase functions:config:set stripe.webhook_secret="whsec_..."
const webhookSecret = functions.config().stripe.webhook_secret;

// Price IDs (create these in Stripe Dashboard)
const PRICE_IDS = {
    price_pro_monthly: 'pro',
    price_pro_annual: 'pro',
    price_business_monthly: 'business',
    price_business_annual: 'business'
};

/**
 * Create a Stripe Checkout Session
 * Called from the extension to start the payment flow
 */
exports.createCheckoutSession = functions
    .region('asia-south1') // Mumbai region for India
    .https.onRequest(async (req, res) => {
        // Enable CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        try {
            const { priceId, userId, email, successUrl, cancelUrl } = req.body;

            if (!priceId || !userId || !email) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            // Check if customer exists or create new one
            let customerId;
            const userDoc = await db.collection('users').doc(userId).get();

            if (userDoc.exists && userDoc.data().stripeCustomerId) {
                customerId = userDoc.data().stripeCustomerId;
            } else {
                // Create new Stripe customer
                const customer = await stripeClient.customers.create({
                    email,
                    metadata: { userId }
                });
                customerId = customer.id;

                // Save customer ID to Firestore
                await db.collection('users').doc(userId).set({
                    stripeCustomerId: customerId
                }, { merge: true });
            }

            // Create checkout session
            const session = await stripeClient.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: priceId,
                    quantity: 1
                }],
                mode: 'subscription',
                success_url: successUrl || 'https://amarika.app/success',
                cancel_url: cancelUrl || 'https://amarika.app/cancel',
                currency: 'inr',
                metadata: {
                    userId,
                    priceId
                },
                // Enable Indian payment methods
                payment_method_options: {
                    card: {
                        request_three_d_secure: 'automatic'
                    }
                }
            });

            res.json({ url: session.url, sessionId: session.id });

        } catch (error) {
            console.error('Checkout session error:', error);
            res.status(500).json({ error: error.message });
        }
    });

/**
 * Stripe Webhook Handler
 * Handles subscription events (payment success, cancellation, etc.)
 */
exports.stripeWebhook = functions
    .region('asia-south1')
    .https.onRequest(async (req, res) => {
        const sig = req.headers['stripe-signature'];

        let event;

        try {
            // Verify webhook signature
            event = stripeClient.webhooks.constructEvent(
                req.rawBody,
                sig,
                webhookSecret
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        console.log('Received event:', event.type);

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await handleCheckoutComplete(event.data.object);
                    break;

                case 'customer.subscription.updated':
                    await handleSubscriptionUpdate(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await handleSubscriptionDeleted(event.data.object);
                    break;

                case 'invoice.payment_failed':
                    await handlePaymentFailed(event.data.object);
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            res.json({ received: true });

        } catch (error) {
            console.error('Webhook handler error:', error);
            res.status(500).json({ error: error.message });
        }
    });

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session) {
    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId;

    if (!userId) {
        console.error('No userId in session metadata');
        return;
    }

    const tier = PRICE_IDS[priceId] || 'pro';

    // Update user subscription in Firestore
    await db.collection('users').doc(userId).set({
        subscription: {
            tier,
            status: 'active',
            stripeSubscriptionId: session.subscription,
            priceId,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            validUntil: null // Will be set by subscription.updated
        }
    }, { merge: true });

    console.log(`User ${userId} upgraded to ${tier}`);
}

/**
 * Handle subscription updates (renewals, changes)
 */
async function handleSubscriptionUpdate(subscription) {
    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error('No user found for customer:', customerId);
        return;
    }

    const userId = usersSnapshot.docs[0].id;
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = PRICE_IDS[priceId] || 'pro';

    // Update subscription status
    await db.collection('users').doc(userId).set({
        subscription: {
            tier,
            status: subscription.status,
            stripeSubscriptionId: subscription.id,
            priceId,
            validUntil: new Date(subscription.current_period_end * 1000).toISOString()
        }
    }, { merge: true });

    console.log(`User ${userId} subscription updated: ${tier} (${subscription.status})`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;

    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) return;

    const userId = usersSnapshot.docs[0].id;

    // Downgrade to free tier
    await db.collection('users').doc(userId).set({
        subscription: {
            tier: 'free',
            status: 'canceled',
            canceledAt: admin.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });

    console.log(`User ${userId} subscription canceled, downgraded to free`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
    const customerId = invoice.customer;

    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) return;

    const userId = usersSnapshot.docs[0].id;

    // Update subscription status
    await db.collection('users').doc(userId).set({
        subscription: {
            status: 'past_due',
            paymentFailedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });

    console.log(`User ${userId} payment failed`);
}
