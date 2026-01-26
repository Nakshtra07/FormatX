// Amarika Checkout Script - Demo Payment Flow
// This script handles the demo payment flow and updates local subscription

// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const subscriptionId = params.get('subscription_id') || 'sub_demo_' + Date.now();
const tier = params.get('tier') || 'pro';
const planName = params.get('plan') || 'Pro Monthly';
const amount = parseInt(params.get('amount')) || 299;

// Process payment
function processPayment() {
    const payBtn = document.getElementById('payBtn');
    const overlay = document.getElementById('processingOverlay');

    // Disable button and show processing
    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';
    overlay.classList.add('active');

    // Simulate payment processing
    setTimeout(function () {
        // Update subscription in extension storage
        updateSubscription();

        // Hide processing overlay
        overlay.classList.remove('active');

        // Show success screen
        document.getElementById('orderPanel').style.display = 'none';
        document.getElementById('paymentPanel').style.display = 'none';
        document.getElementById('successScreen').classList.add('active');

    }, 2500);
}

// Update subscription in extension storage
function updateSubscription() {
    // Try to communicate with extension
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                action: 'UPDATE_SUBSCRIPTION',
                tier: tier,
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }, function (response) {
                console.log('Subscription updated:', response);
            });
        }
    } catch (e) {
        console.log('Could not communicate with extension:', e);
    }

    // Also store in localStorage as fallback
    var subscription = {
        tier: tier,
        status: 'active',
        planName: planName,
        amount: amount,
        subscriptionId: subscriptionId,
        startedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentId: 'pay_demo_' + Date.now()
    };

    localStorage.setItem('amarika_subscription', JSON.stringify(subscription));
    console.log('Demo subscription saved:', subscription);
}

// Close checkout and return to extension
function closeCheckout() {
    window.close();
}

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Set order details
    document.getElementById('orderId').textContent = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('planName').textContent = planName;
    document.getElementById('planPrice').textContent = '₹' + amount;
    document.getElementById('totalAmount').textContent = '₹' + amount;
    document.getElementById('btnAmount').textContent = amount;
    document.getElementById('successAmount').textContent = '₹' + amount;
    document.getElementById('txnId').textContent = Date.now().toString().slice(-10);

    // Payment method switching
    var methodBtns = document.querySelectorAll('.method-btn');
    var formSections = document.querySelectorAll('.form-section');

    methodBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var method = this.dataset.method;

            // Update active button
            methodBtns.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');

            // Show correct form
            formSections.forEach(function (f) { f.classList.remove('active'); });
            document.getElementById(method + 'Form').classList.add('active');
        });
    });

    // Format card number
    document.getElementById('cardNumber').addEventListener('input', function (e) {
        var value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        var formatted = value.match(/.{1,4}/g);
        e.target.value = formatted ? formatted.join(' ') : value;
    });

    // Format expiry
    document.getElementById('expiry').addEventListener('input', function (e) {
        var value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        e.target.value = value;
    });

    // UPI app clicks
    document.querySelectorAll('.upi-app').forEach(function (app) {
        app.addEventListener('click', function () {
            processPayment();
        });
    });

    // Pay button click
    document.getElementById('payBtn').addEventListener('click', processPayment);

    // Close button click
    document.getElementById('closeBtn').addEventListener('click', closeCheckout);
});
