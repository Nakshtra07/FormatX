"""
Custom Templates API Routes

Provides endpoints for managing user-specific custom templates.
All endpoints require OAuth authentication.
"""

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import httpx

from services.template_extractor import template_extractor
from services.user_template_store import user_template_store


router = APIRouter(prefix="/templates/custom", tags=["Custom Templates"])
security = HTTPBearer()

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


async def get_current_user_email(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Validate OAuth token and extract user email.
    """
    token = credentials.credentials
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or expired access token"
                )
            
            user_info = response.json()
            email = user_info.get("email")
            
            if not email:
                raise HTTPException(
                    status_code=401,
                    detail="Could not retrieve user email from token"
                )
            
            return email
            
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Could not validate token with Google"
        )


class TemplateResponse(BaseModel):
    """Response model for template operations."""
    id: str
    name: str
    created_at: str
    source_filename: str
    sections_count: int
    font: str
    is_custom: bool = True


class TemplateListResponse(BaseModel):
    """Response model for listing templates."""
    templates: list[TemplateResponse]
    count: int


class TemplateDetailResponse(BaseModel):
    """Response model for template details."""
    id: str
    name: str
    created_at: str
    source_filename: str
    font: str
    margins: dict
    sections: list
    styles: dict


class DeleteResponse(BaseModel):
    """Response model for delete operations."""
    success: bool
    message: str


@router.post("/upload", response_model=TemplateResponse)
async def upload_template(
    file: UploadFile = File(...),
    template_name: str = Form(...),
    user_email: str = Depends(get_current_user_email)
):
    """
    Upload a Word or PDF document to create a custom template.
    
    The document's formatting (fonts, sizes, margins, section styles) 
    will be extracted and saved as a reusable template.
    """
    # Validate file type
    filename = file.filename.lower()
    if not (filename.endswith('.docx') or filename.endswith('.pdf')):
        raise HTTPException(
            status_code=400,
            detail="Only .docx and .pdf files are supported"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Check if file is empty
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )
    
    try:
        # Extract template from document
        template_data = template_extractor.extract_template(content, file.filename)
        
        # Save template for user
        created_template = user_template_store.create_template(
            user_email=user_email,
            template_name=template_name,
            template_data=template_data,
            source_filename=file.filename
        )
        
        return TemplateResponse(
            id=created_template["id"],
            name=created_template["name"],
            created_at=created_template["created_at"],
            source_filename=created_template["source_filename"],
            sections_count=len(created_template.get("sections", [])),
            font=created_template.get("font", "Unknown")
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {str(e)}"
        )


@router.get("/list", response_model=TemplateListResponse)
async def list_templates(user_email: str = Depends(get_current_user_email)):
    """
    Get all custom templates for the authenticated user.
    """
    templates = user_template_store.get_user_templates(user_email)
    
    return TemplateListResponse(
        templates=[TemplateResponse(**t) for t in templates],
        count=len(templates)
    )


@router.get("/{template_id}", response_model=TemplateDetailResponse)
async def get_template(
    template_id: str,
    user_email: str = Depends(get_current_user_email)
):
    """
    Get detailed information about a specific custom template.
    """
    template = user_template_store.get_template(user_email, template_id)
    
    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )
    
    return TemplateDetailResponse(
        id=template["id"],
        name=template["name"],
        created_at=template.get("created_at", ""),
        source_filename=template.get("source_filename", ""),
        font=template.get("font", "Unknown"),
        margins=template.get("margins", {}),
        sections=template.get("sections", []),
        styles=template.get("styles", {})
    )


@router.delete("/{template_id}", response_model=DeleteResponse)
async def delete_template(
    template_id: str,
    user_email: str = Depends(get_current_user_email)
):
    """
    Delete a custom template.
    """
    success = user_template_store.delete_template(user_email, template_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )
    
    return DeleteResponse(
        success=True,
        message="Template deleted successfully"
    )
