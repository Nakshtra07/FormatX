import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, Zap, Crown, Sparkles, AlertCircle, CheckCircle, ArrowLeft, CreditCard, X, Lock, Smartphone } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Razorpay Test Key - Replace with your test key from Razorpay Dashboard
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXXX'

// Fallback plans for demo when API is unavailable
const FALLBACK_PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'INR',
        features: ['10 formats per month', 'Basic templates', 'Google Docs support', 'Community support']
    },
    {
        id: 'pro_monthly',
        name: 'Pro Monthly',
        price: 39900,
        currency: 'INR',
        features: ['Unlimited formatting', 'IEEE & corporate templates', 'Code styling', 'Priority support']
    },
    {
        id: 'pro_yearly',
        name: 'Pro Yearly',
        price: 399900,
        currency: 'INR',
        features: ['Everything in Pro', 'Save ₹789 (2 months free)', 'Early access', 'Priority support']
    }
]

// Demo Payment Modal Component (Razorpay-like UI)
function PaymentModal({ plan, onClose, onSuccess, user }) {
    const [paymentMethod, setPaymentMethod] = useState('card')
    const [cardNumber, setCardNumber] = useState('')
    const [expiry, setExpiry] = useState('')
    const [cvv, setCvv] = useState('')
    const [upiId, setUpiId] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
        const matches = v.match(/\d{4,16}/g)
        const match = matches && matches[0] || ''
        const parts = []
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4))
        }
        return parts.length ? parts.join(' ') : value
    }

    const formatExpiry = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4)
        }
        return v
    }

    const handlePayment = async () => {
        setIsProcessing(true)
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsProcessing(false)
        onSuccess()
    }

    const formatPrice = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="payment-modal-header">
                    <div className="payment-modal-brand">
                        <img src="/logo.png" alt="FormatX" style={{ height: '28px' }} />
                        <span>FormatX</span>
                    </div>
                    <button className="payment-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Order Summary */}
                <div className="payment-order-summary">
                    <div className="payment-order-item">
                        <span>{plan.name} Subscription</span>
                        <span className="payment-amount">{formatPrice(plan.price)}</span>
                    </div>
                    <div className="payment-order-email">
                        <span>Email: {user?.email || 'user@example.com'}</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="payment-methods">
                    <div
                        className={`payment-method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('card')}
                    >
                        <CreditCard size={18} />
                        <span>Card</span>
                    </div>
                    <div
                        className={`payment-method-tab ${paymentMethod === 'upi' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('upi')}
                    >
                        <Smartphone size={18} />
                        <span>UPI</span>
                    </div>
                </div>

                {/* Card Payment Form */}
                {paymentMethod === 'card' && (
                    <div className="payment-form">
                        <div className="payment-input-group">
                            <label>Card Number</label>
                            <input
                                type="text"
                                placeholder="4111 1111 1111 1111"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                maxLength={19}
                            />
                            <div className="card-icons">
                                <img src="/icons/visa.svg" alt="Visa" />
                                <img src="/icons/mastercard.svg" alt="Mastercard" />
                            </div>
                        </div>
                        <div className="payment-input-row">
                            <div className="payment-input-group">
                                <label>Expiry</label>
                                <input
                                    type="text"
                                    placeholder="MM/YY"
                                    value={expiry}
                                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                    maxLength={5}
                                />
                            </div>
                            <div className="payment-input-group">
                                <label>CVV</label>
                                <input
                                    type="password"
                                    placeholder="•••"
                                    value={cvv}
                                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    maxLength={3}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* UPI Payment Form */}
                {paymentMethod === 'upi' && (
                    <div className="payment-form">
                        <div className="payment-input-group">
                            <label>UPI ID</label>
                            <input
                                type="text"
                                placeholder="yourname@upi"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                            />
                        </div>
                        <div className="upi-apps">
                            <img src="/icons/gpay.svg" alt="Google Pay" />
                            <img src="/icons/phonepe.svg" alt="PhonePe" />
                            <img src="/icons/paytm.svg" alt="Paytm" />
                        </div>
                    </div>
                )}

                {/* Pay Button */}
                <button
                    className="payment-submit-btn"
                    onClick={handlePayment}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <div className="spinner"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <Lock size={16} />
                            Pay {formatPrice(plan.price)}
                        </>
                    )}
                </button>

                {/* Footer */}
                <div className="payment-footer">
                    <Lock size={12} />
                    <span>Secured by Razorpay</span>
                    <span className="test-badge">TEST MODE</span>
                </div>
            </div>
        </div>
    )
}

function Pricing({ user, accessToken, onSubscriptionChange }) {
    // Start with fallback plans immediately - instant load, no spinner
    const [plans, setPlans] = useState(FALLBACK_PLANS)
    const [processingPlan, setProcessingPlan] = useState(null)
    const [status, setStatus] = useState({ type: '', message: '' })
    const [currentPlan, setCurrentPlan] = useState('free')
    const [showPaymentModal, setShowPaymentModal] = useState(null) // Stores selected plan for payment

    // Fetch plans in background on mount (non-blocking)
    useEffect(() => {
        fetchPlans()
        fetchSubscriptionStatus()
    }, [])

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script)
            }
        }
    }, [])

    const fetchPlans = async () => {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

            const response = await fetch(`${API_URL}/payments/plans`, {
                signal: controller.signal
            })
            clearTimeout(timeoutId)

            if (response.ok) {
                const data = await response.json()
                if (data.plans && data.plans.length > 0) {
                    setPlans(data.plans)
                }
            }
        } catch (error) {
            // Silently use fallback - already loaded
            console.log('Using fallback plans (API unavailable)')
        }
    }

    const fetchSubscriptionStatus = async () => {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch(`${API_URL}/payments/subscription-status`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                signal: controller.signal
            })
            clearTimeout(timeoutId)

            if (response.ok) {
                const data = await response.json()
                setCurrentPlan(data.plan)
            }
        } catch (error) {
            // Silently fail - default to free plan
        }
    }

    const handleSubscribe = (planId) => {
        if (planId === 'free') return

        // Find the plan and open payment modal
        const plan = plans.find(p => p.id === planId)
        if (plan) {
            setShowPaymentModal(plan)
        }
    }

    const handlePaymentSuccess = () => {
        const plan = showPaymentModal
        setShowPaymentModal(null)
        setStatus({
            type: 'success',
            message: `🎉 Payment Successful! Your ${plan.name} subscription is now active.`
        })
        setCurrentPlan(plan.id)
        if (onSubscriptionChange) {
            onSubscriptionChange(plan.id)
        }
    }

    const formatPrice = (paise) => {
        if (paise === 0) return 'Free'
        return `₹${(paise / 100).toLocaleString('en-IN')}`
    }

    const getPlanIcon = (planId) => {
        if (planId === 'free') return <Zap size={24} />
        return <Crown size={24} />
    }

    return (
        <div className="dashboard">
            {/* Navbar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="navbar-brand">
                        <img src="/logo.png" alt="FormatX" style={{ height: '40px', width: 'auto', marginRight: '0.75rem' }} />
                        FormatX
                    </div>
                    <div className="navbar-user">
                        <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                            <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="pricing-container">
                <div className="pricing-header">
                    <h2 className="pricing-title">
                        <Sparkles size={28} style={{ marginRight: '12px' }} />
                        Choose Your Plan
                    </h2>
                    <p className="pricing-subtitle">
                        Start free, upgrade as you grow
                    </p>
                    <div className="test-mode-badge">
                        <AlertCircle size={14} />
                        <span>Test Mode - No real payments</span>
                    </div>
                </div>

                {status.message && (
                    <div className={`status status-${status.type}`} style={{ marginBottom: '24px' }}>
                        {status.type === 'success' && <CheckCircle size={16} />}
                        {status.type === 'error' && <AlertCircle size={16} />}
                        {status.message}
                    </div>
                )}

                <div className="pricing-grid">
                    {plans.map((plan) => {
                        const isCurrentPlan = currentPlan === plan.id
                        const isPro = plan.id !== 'free'
                        const isYearly = plan.id === 'pro_yearly'

                        return (
                            <div
                                key={plan.id}
                                className={`pricing-card ${isPro ? 'pricing-card-pro' : ''} ${isYearly ? 'pricing-card-featured' : ''} ${isCurrentPlan ? 'pricing-card-current' : ''}`}
                            >
                                {isYearly && (
                                    <div className="pricing-badge">Best Value</div>
                                )}
                                {isCurrentPlan && (
                                    <div className="current-plan-badge">Current Plan</div>
                                )}

                                <div className="pricing-card-header">
                                    <div className="pricing-icon">
                                        {getPlanIcon(plan.id)}
                                    </div>
                                    <h3 className="pricing-plan-name">{plan.name}</h3>
                                    <div className="pricing-price">
                                        <span className="price-amount">{formatPrice(plan.price)}</span>
                                        {plan.price > 0 && (
                                            <span className="price-period">
                                                /{plan.id.includes('yearly') ? 'year' : 'month'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ul className="pricing-features">
                                    {plan.features.map((feature, index) => (
                                        <li key={index}>
                                            <Check size={16} className="feature-check" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`btn ${isPro ? 'btn-primary' : 'btn-secondary'} btn-full`}
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={isCurrentPlan || processingPlan === plan.id}
                                >
                                    {processingPlan === plan.id ? (
                                        <>
                                            <div className="spinner"></div>
                                            Processing...
                                        </>
                                    ) : isCurrentPlan ? (
                                        'Current Plan'
                                    ) : plan.price === 0 ? (
                                        'Get Started Free'
                                    ) : (
                                        <>
                                            <Sparkles size={16} style={{ marginRight: '8px' }} />
                                            Subscribe Now
                                        </>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                <div className="pricing-footer">
                    <p>
                        <strong>Test Card for Demo:</strong> 4111 1111 1111 1111 | Exp: Any future date | CVV: Any 3 digits
                    </p>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    plan={showPaymentModal}
                    user={user}
                    onClose={() => setShowPaymentModal(null)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    )
}

export default Pricing
