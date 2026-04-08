# Razorpay Setup Guide for FormatX

## 1. Create Razorpay Account

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) and sign up
2. Complete KYC verification (Aadhaar-based for individuals)
3. Switch to **Live Mode** in dashboard header

## 2. API Keys Configured

The extension is configured with your **LIVE** keys:
- `Key ID`: `rzp_live_S8BcJw5chKMam6`

## 3. Subscription Plans Configured

The following Live Plans are configured:

| Plan | ID | Amount |
|------|----|--------|
| Pro Monthly | `plan_S8BeIBeGKwZWax` | ₹299 |
| Pro Annual | `plan_S8BerugbTT3JAL` | ₹2,499 |
| Business Monthly | `plan_S8BfRb5x6CBtAN` | ₹799 |
| Business Annual | `plan_S8Bfv7YVfofk1d` | ₹6,999 |

## 4. Deploy Firebase Cloud Functions

You need to redeploy the cloud functions for the new keys to take effect on the server:

```bash
# Navigate to functions directory
cd firebase/functions

# Install dependencies if you haven't
npm install

# Set Razorpay Live config 
# (These are already hardcoded as defaults in index.js, but good practice to set in env)
firebase functions:config:set razorpay.key_id="rzp_live_S8BcJw5chKMam6"
firebase functions:config:set razorpay.key_secret="5rOBRd36xNZm0twER9Hzuiy6"
firebase functions:config:set razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"

# Deploy functions
firebase deploy --only functions
```

## 5. Configure Razorpay Webhook

1. Go to **Settings → Webhooks → Add New Webhook**
2. Webhook URL: `https://razorpaywebhook-ulft6w3rqa-el.a.run.app`
3. Secret: Create a secret string (e.g., `formatx_secret`)
4. Save this secret: `firebase functions:config:set razorpay.webhook_secret="formatx_secret"`
5. Select events:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.paused`
   - `payment.failed`
6. Save webhook

## Testing in Live Mode

To test in Live Mode, you will need to make a real payment of ₹299. You can refund it immediately from the dashboard if needed.

## Support

- Razorpay Docs: https://razorpay.com/docs/
