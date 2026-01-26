// Subscription Configuration - Amarika (Razorpay)
// All prices in INR (Indian Rupees)

// Subscription tiers
export const TIERS = {
    FREE: 'free',
    PRO: 'pro',
    BUSINESS: 'business'
};

// Pricing configuration (in INR) - Update Plan IDs after creating in Razorpay
export const PRICING = {
    pro: {
        monthly: {
            amount: 299,
            planId: 'plan_S8BeIBeGKwZWax', // Replace with actual Razorpay Plan ID
            label: '₹299/month'
        },
        annual: {
            amount: 2499,
            planId: 'plan_S8BerugbTT3JAL', // Replace with actual Razorpay Plan ID
            label: '₹2,499/year',
            savings: '₹1,089 savings'
        }
    },
    business: {
        monthly: {
            amount: 799,
            planId: 'plan_S8BfRb5x6CBtAN', // Replace with actual Razorpay Plan ID
            label: '₹799/month'
        },
        annual: {
            amount: 6999,
            planId: 'plan_S8Bfv7YVfofk1d', // Replace with actual Razorpay Plan ID
            label: '₹6,999/year',
            savings: '₹2,589 savings'
        }
    }
};

// Feature limits by tier
export const TIER_LIMITS = {
    free: {
        name: 'Free',
        customTemplates: 1,
        importFromDoc: false,
        aiFormatting: false,
        prioritySupport: false
    },
    pro: {
        name: 'Pro',
        customTemplates: 10,
        importFromDoc: true,
        aiFormatting: true,
        prioritySupport: false
    },
    business: {
        name: 'Business',
        customTemplates: Infinity,
        importFromDoc: true,
        aiFormatting: true,
        prioritySupport: true
    }
};

// Feature descriptions for upgrade modal
export const FEATURES = {
    customTemplates: {
        name: 'Custom Templates',
        description: 'Create and save your own templates',
        icon: '🎨'
    },
    importFromDoc: {
        name: 'Import from Doc',
        description: 'Extract styles from any Google Doc',
        icon: '📥'
    },
    aiFormatting: {
        name: 'AI Formatting',
        description: 'Smart formatting suggestions',
        icon: '🤖'
    },
    prioritySupport: {
        name: 'Priority Support',
        description: 'Get help faster via email',
        icon: '💬'
    }
};

// Check if user has access to a feature
export function hasFeatureAccess(tier, feature) {
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    return !!limits[feature];
}

// Get template limit for tier
export function getTemplateLimit(tier) {
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    return limits.customTemplates;
}

// Check if user can create more templates
export function canCreateTemplate(tier, currentCount) {
    const limit = getTemplateLimit(tier);
    return currentCount < limit;
}

// Format price for display
export function formatPrice(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(amount);
}
