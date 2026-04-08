// Pricing configuration (INR) - TEST MODE
const PRICING = {
    pro: {
        monthly: { amount: 299, planId: 'plan_S8HkUbeANDtrsP', period: '/month' },
        annual: { amount: 2499, planId: 'plan_S8Hm0hBBAVpqxw', period: '/year', savings: 'Save ₹1,089' }
    },
    business: {
        monthly: { amount: 799, planId: 'plan_S8HkUbeANDtrsP', period: '/month' },  // Uses Pro planId for demo
        annual: { amount: 6999, planId: 'plan_S8Hm0hBBAVpqxw', period: '/year', savings: 'Save ₹2,589' }  // Uses Pro planId for demo
    }
};

// State
let billingCycle = 'monthly';
let currentTier = 'free';

// DOM Elements
const elements = {
    backBtn: document.getElementById('backBtn'),
    monthlyBtn: document.getElementById('monthlyBtn'),
    annualBtn: document.getElementById('annualBtn'),
    proPrice: document.getElementById('proPrice'),
    proPeriod: document.getElementById('proPeriod'),
    proSavings: document.getElementById('proSavings'),
    businessPrice: document.getElementById('businessPrice'),
    businessPeriod: document.getElementById('businessPeriod'),
    businessSavings: document.getElementById('businessSavings'),
    proBtn: document.getElementById('proBtn'),
    businessBtn: document.getElementById('businessBtn')
};

// Format price in INR
function formatPrice(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

// Update prices based on billing cycle
function updatePrices() {
    const proPricing = PRICING.pro[billingCycle];
    const businessPricing = PRICING.business[billingCycle];

    elements.proPrice.textContent = formatPrice(proPricing.amount);
    elements.proPeriod.textContent = proPricing.period;

    elements.businessPrice.textContent = formatPrice(businessPricing.amount);
    elements.businessPeriod.textContent = businessPricing.period;

    if (billingCycle === 'annual') {
        elements.proSavings.textContent = proPricing.savings;
        elements.proSavings.classList.remove('hidden');
        elements.businessSavings.textContent = businessPricing.savings;
        elements.businessSavings.classList.remove('hidden');
    } else {
        elements.proSavings.classList.add('hidden');
        elements.businessSavings.classList.add('hidden');
    }
}

// Toggle billing cycle
function setBillingCycle(cycle) {
    billingCycle = cycle;

    elements.monthlyBtn.classList.toggle('active', cycle === 'monthly');
    elements.annualBtn.classList.toggle('active', cycle === 'annual');

    updatePrices();
}

// Handle plan selection - Opens Razorpay hosted checkout page
async function selectPlan(tier) {
    const pricing = PRICING[tier][billingCycle];

    // Show loading state
    const btn = tier === 'pro' ? elements.proBtn : elements.businessBtn;
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
        // Request Razorpay subscription from background service worker
        const response = await chrome.runtime.sendMessage({
            action: 'CREATE_CHECKOUT',
            planId: pricing.planId,
            tier: tier
        });

        if (response.success && response.data?.url) {
            // Open Razorpay hosted checkout page in new tab
            chrome.tabs.create({ url: response.data.url });
            window.close();
        } else {
            throw new Error(response.error || 'Failed to start checkout');
        }
    } catch (error) {
        alert('Payment error: ' + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Update UI based on current tier
function updateCurrentTierUI() {
    document.querySelectorAll('.plan-card').forEach(card => {
        const tier = card.dataset.tier;
        const btn = card.querySelector('.btn-plan');

        if (tier === currentTier) {
            btn.textContent = 'Current Plan';
            btn.classList.add('current');
            btn.disabled = true;
        }
    });
}

// Load current user tier
async function loadCurrentTier() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_PROFILE' });
        if (response.success && response.data) {
            currentTier = response.data.subscription?.tier || 'free';
            updateCurrentTierUI();
        }
    } catch (error) {
        console.error('Failed to load tier:', error);
    }
}

// Event Listeners
elements.backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
});

elements.monthlyBtn.addEventListener('click', () => setBillingCycle('monthly'));
elements.annualBtn.addEventListener('click', () => setBillingCycle('annual'));

elements.proBtn.addEventListener('click', () => selectPlan('pro'));
elements.businessBtn.addEventListener('click', () => selectPlan('business'));

// Initialize
updatePrices();
loadCurrentTier();
