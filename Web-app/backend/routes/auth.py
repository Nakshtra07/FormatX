"""
Authentication routes for Google OAuth 2.0.
Handles token exchange and validation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from config import settings

router = APIRouter()


class TokenExchangeRequest(BaseModel):
    """Request body for exchanging Google auth code for tokens."""
    code: str
    redirect_uri: str | None = None


class TokenResponse(BaseModel):
    """Response containing access and refresh tokens."""
    access_token: str
    refresh_token: str | None = None
    expires_in: int
    token_type: str = "Bearer"
    scope: str | None = None


class RefreshTokenRequest(BaseModel):
    """Request body for refreshing access token."""
    refresh_token: str


@router.post("/google/token", response_model=TokenResponse)
async def exchange_google_token(request: TokenExchangeRequest):
    """
    Exchange Google authorization code for access and refresh tokens.
    
    This endpoint receives the auth code from the frontend after the user
    completes Google Sign-In, and exchanges it for tokens using Google's
    OAuth 2.0 token endpoint.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": request.code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": request.redirect_uri or settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Google OAuth error: {error_data.get('error_description', error_data.get('error', 'Unknown error'))}"
                )
            
            token_data = response.json()
            return TokenResponse(
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token"),
                expires_in=token_data.get("expires_in", 3600),
                token_type=token_data.get("token_type", "Bearer"),
                scope=token_data.get("scope"),
            )
            
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Google OAuth: {str(e)}"
            )


@router.post("/google/refresh", response_model=TokenResponse)
async def refresh_google_token(request: RefreshTokenRequest):
    """
    Refresh an expired Google access token using a refresh token.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "refresh_token": request.refresh_token,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "grant_type": "refresh_token",
                },
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Token refresh failed: {error_data.get('error_description', error_data.get('error', 'Unknown error'))}"
                )
            
            token_data = response.json()
            return TokenResponse(
                access_token=token_data["access_token"],
                refresh_token=request.refresh_token,  # Refresh token doesn't change
                expires_in=token_data.get("expires_in", 3600),
                token_type=token_data.get("token_type", "Bearer"),
                scope=token_data.get("scope"),
            )
            
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to Google OAuth: {str(e)}"
            )


@router.get("/google/userinfo")
async def get_user_info(access_token: str):
    """
    Get user information using the access token.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or expired access token"
                )
            
            return response.json()
            
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch user info: {str(e)}"
            )
