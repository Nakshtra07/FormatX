"""
Razorpay Payment Integration Routes.
Handles subscription payments using Razorpay in TEST MODE.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import razorpay
import os
from typing import Optional

router = APIRouter()

# ============================================
# RAZORPAY TEST MODE CONFIGURATION
# ============================================
# These are TEST keys - no real payments will be processed
# Get your test keys from: https://dashboard.razorpay.com/app/keys

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_XXXXXXXXXXXXXXX")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "XXXXXXXXXXXXXXXXXXXXXXXX")

# Initialize Razorpay client
try:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    razorpay_client.set_app_details({"title": "Amarika", "version": "1.0.0"})
except Exception as e:
    print(f"Warning: Razorpay client initialization failed: {e}")
    razorpay_client = None


# ============================================
# SUBSCRIPTION PLANS (Test Mode)
# ============================================
PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price": 0,
        "currency": "INR",
        "features": [
            "10 formats per month",
            "Basic templates",
            "Google Docs support",
            "Community support"
        ]
    },
    "pro_monthly": {
        "id": "pro_monthly",
        "name": "Pro Monthly",
        "price": 39900,  # ₹399 in paise
        "currency": "INR",
        "features": [
            "Unlimited formatting",
            "IEEE & corporate templates",
            "Code styling & syntax highlighting",
            "Google Docs + Word support",
            "Priority support"
        ]
    },
    "pro_yearly": {
        "id": "pro_yearly",
        "name": "Pro Yearly",
        "price": 399900,  # ₹3999 in paise (save 2 months)
        "currency": "INR",
        "features": [
            "Everything in Pro Monthly",
            "Save ₹789 (2 months free)",
            "Early access to new features",
            "Priority support"
        ]
    }
}


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================
class CreateOrderRequest(BaseModel):
    plan_id: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str
    plan_name: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    plan_id: Optional[str] = None
    subscription_active: bool = False


# ============================================
# API ENDPOINTS
# ============================================

@router.get("/plans")
async def get_plans():
    """
    Get all available subscription plans.
    """
    return {
        "plans": list(PLANS.values()),
        "test_mode": True  # Always indicate test mode for hackathon
    }


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    request: CreateOrderRequest,
    authorization: str = Header(..., description="Bearer token from Google OAuth")
):
    """
    Create a Razorpay order for payment.
    This is TEST MODE - no real money will be charged.
    """
    # Validate plan
    if request.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    plan = PLANS[request.plan_id]
    
    # Free plan doesn't need payment
    if plan["price"] == 0:
        raise HTTPException(status_code=400, detail="Free plan doesn't require payment")
    
    # Check if Razorpay client is available
    if not razorpay_client:
        # Return mock order for demo/testing without actual Razorpay
        return CreateOrderResponse(
            order_id="order_demo_" + os.urandom(8).hex(),
            amount=plan["price"],
            currency=plan["currency"],
            key_id=RAZORPAY_KEY_ID,
            plan_name=plan["name"]
        )
    
    try:
        # Create Razorpay order
        order_data = {
            "amount": plan["price"],  # Amount in paise
            "currency": plan["currency"],
            "receipt": f"amarika_{request.plan_id}_{os.urandom(4).hex()}",
            "notes": {
                "plan_id": request.plan_id,
                "user_email": request.user_email or "",
                "user_name": request.user_name or "",
                "test_mode": "true"
            }
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        return CreateOrderResponse(
            order_id=order["id"],
            amount=order["amount"],
            currency=order["currency"],
            key_id=RAZORPAY_KEY_ID,
            plan_name=plan["name"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.post("/verify-payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    request: VerifyPaymentRequest,
    authorization: str = Header(..., description="Bearer token from Google OAuth")
):
    """
    Verify Razorpay payment signature.
    In TEST MODE, this simulates successful verification.
    """
    # Demo mode - accept all payments for hackathon demo
    if request.razorpay_order_id.startswith("order_demo_"):
        return VerifyPaymentResponse(
            success=True,
            message="Demo payment successful! (Test Mode)",
            plan_id=request.plan_id,
            subscription_active=True
        )
    
    if not razorpay_client:
        # No Razorpay client - return success for demo
        return VerifyPaymentResponse(
            success=True,
            message="Payment verified! (Demo Mode)",
            plan_id=request.plan_id,
            subscription_active=True
        )
    
    try:
        # Verify signature
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # In a real app, you would:
        # 1. Update user's subscription status in database
        # 2. Send confirmation email
        # 3. Log the transaction
        
        return VerifyPaymentResponse(
            success=True,
            message="Payment successful! Your Pro subscription is now active.",
            plan_id=request.plan_id,
            subscription_active=True
        )
        
    except razorpay.errors.SignatureVerificationError:
        return VerifyPaymentResponse(
            success=False,
            message="Payment verification failed. Please contact support.",
            subscription_active=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


@router.get("/subscription-status")
async def get_subscription_status(
    authorization: str = Header(..., description="Bearer token from Google OAuth")
):
    """
    Get current user's subscription status.
    For hackathon demo, this returns a mock status.
    """
    # In a real app, you would fetch from database
    # For demo, return free tier status
    return {
        "plan": "free",
        "plan_name": "Free",
        "formats_remaining": 10,
        "formats_total": 10,
        "is_pro": False,
        "test_mode": True
    }
