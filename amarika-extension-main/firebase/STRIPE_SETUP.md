# Stripe Setup Guide for Amarika

## 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete verification for India (PAN card, bank account)
3. Enable **Test Mode** for development

## 2. Create Products & Prices

In Stripe Dashboard → Products → Add Product:

### Product 1: Amarika Pro
```
Name: Amarika Pro
Description: Professional document formatting

Prices:
- ₹299/month (Monthly)
  - Price ID: price_pro_monthly (copy this ID)
- ₹2,499/year (Yearly)
  - Price ID: price_pro_annual (copy this ID)
```

### Product 2: Amarika Business
```
Name: Amarika Business
Description: Business document formatting with priority support

Prices:
- ₹799/month (Monthly)
  - Price ID: price_business_monthly (copy this ID)
- ₹6,999/year (Yearly)
  - Price ID: price_business_annual (copy this ID)
```

## 3. Update Extension with Price IDs

Edit `popup/pricing.js` and update the price IDs:

```javascript
const PRICING = {
  pro: {
    monthly: { amount: 299, priceId: 'price_xxxxx', period: '/month' },
    annual: { amount: 2499, priceId: 'price_xxxxx', period: '/year', savings: 'Save ₹1,089' }
  },
  business: {
    monthly: { amount: 799, priceId: 'price_xxxxx', period: '/month' },
    annual: { amount: 6999, priceId: 'price_xxxxx', period: '/year', savings: 'Save ₹2,589' }
  }
};
```

## 4. Deploy Firebase Cloud Functions

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
cd firebase
firebase init functions

# Set Stripe config
firebase functions:config:set stripe.secret_key="sk_live_xxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"

# Deploy functions
firebase deploy --only functions
```

## 5. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://asia-south1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the Webhook Signing Secret

## 6. Update Extension with Cloud Function URL

Edit `background/service-worker.js`:

```javascript
const STRIPE_CONFIG = {
    publishableKey: 'pk_live_xxxxx',
    checkoutEndpoint: 'https://asia-south1-YOUR_PROJECT.cloudfunctions.net/createCheckoutSession'
};
```

## 7. Test the Flow

1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Any Indian PIN code

## 8. Go Live

1. Complete Stripe verification
2. Switch from Test Mode to Live Mode
3. Update all keys to live keys
4. Redeploy Cloud Functions with live keys
