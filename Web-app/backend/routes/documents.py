"""
Document routes for formatting Google Docs.
Handles document fetching, AI processing, and updates.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from services.google_docs import GoogleDocsService
from services.ai_engine import AIEngine
from services.template_engine import TemplateEngine
from services.instruction_generator import InstructionGenerator

router = APIRouter()


class FormatRequest(BaseModel):
    """Request body for document formatting."""
    doc_url: str
    template_id: str = "ieee_research_paper"
    preview_only: bool = False


class FormatResponse(BaseModel):
    """Response after formatting a document."""
    success: bool
    message: str
    doc_id: str
    template_used: str
    sections_detected: list[str]
    preview: Optional[dict] = None


class DocumentInfo(BaseModel):
    """Basic document information."""
    doc_id: str
    title: str
    word_count: int


@router.post("/format", response_model=FormatResponse)
async def format_document(
    request: FormatRequest,
    authorization: str = Header(..., description="Bearer token from Google OAuth")
):
    """
    Format a Google Doc using AI and apply the selected template.
    
    This is the main endpoint that:
    1. Extracts the document ID from the URL
    2. Fetches the document content via Google Docs API
    3. Sends content to AI for restructuring
    4. Applies the template structure
    5. Generates batchUpdate requests
    6. Updates the document (unless preview_only is True)
    """
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    access_token = authorization.replace("Bearer ", "")
    
    # Initialize services
    docs_service = GoogleDocsService(access_token)
    ai_engine = AIEngine()
    template_engine = TemplateEngine()
    instruction_gen = InstructionGenerator()
    
    try:
        # Step 1: Extract document ID from URL
        doc_id = docs_service.extract_doc_id(request.doc_url)
        if not doc_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid Google Docs URL. Please provide a valid URL like https://docs.google.com/document/d/DOC_ID/edit"
            )
        
        # Step 2: Fetch document content
        doc_content = await docs_service.fetch_document(doc_id)
        
        # Step 3: Extract plain text from document
        plain_text = docs_service.extract_text(doc_content)
        
        if len(plain_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Document appears to be empty or too short to format"
            )
        
        # Step 4: Load template (check for custom templates first)
        template = None
        if request.template_id.startswith("custom_"):
            # This is a custom user template - need to get user email and load it
            try:
                import httpx
                from services.user_template_store import user_template_store
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    
                    if response.status_code == 200:
                        user_info = response.json()
                        user_email = user_info.get("email")
                        
                        if user_email:
                            template = user_template_store.get_template_for_formatting(
                                user_email, 
                                request.template_id
                            )
                
                if not template:
                    raise HTTPException(
                        status_code=404,
                        detail="Custom template not found or access denied"
                    )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error loading custom template: {str(e)}"
                )
        else:
            # Built-in template
            template = template_engine.load_template(request.template_id)
        
        # Step 5: Process with AI
        ai_result = await ai_engine.process_document(plain_text, template)
        
        # Step 6: Generate Docs API instructions
        batch_requests = instruction_gen.generate_requests(
            ai_result,
            template,
            doc_content
        )
        
        sections_detected = [section["heading"] for section in ai_result.get("sections", [])]
        
        # Step 7: Apply updates (unless preview only)
        if not request.preview_only:
            await docs_service.update_document(doc_id, batch_requests)
            message = "Document formatted successfully!"
        else:
            message = "Preview generated. No changes applied to document."
        
        return FormatResponse(
            success=True,
            message=message,
            doc_id=doc_id,
            template_used=request.template_id,
            sections_detected=sections_detected,
            preview=ai_result if request.preview_only else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error formatting document: {str(e)}"
        )


@router.get("/info")
async def get_document_info(
    doc_url: str,
    authorization: str = Header(..., description="Bearer token from Google OAuth")
) -> DocumentInfo:
    """
    Get basic information about a Google Doc without modifying it.
    Useful for previewing before formatting.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    access_token = authorization.replace("Bearer ", "")
    docs_service = GoogleDocsService(access_token)
    
    try:
        doc_id = docs_service.extract_doc_id(doc_url)
        if not doc_id:
            raise HTTPException(status_code=400, detail="Invalid Google Docs URL")
        
        doc_content = await docs_service.fetch_document(doc_id)
        plain_text = docs_service.extract_text(doc_content)
        
        return DocumentInfo(
            doc_id=doc_id,
            title=doc_content.get("title", "Untitled"),
            word_count=len(plain_text.split())
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching document info: {str(e)}"
        )


@router.get("/templates")
async def list_templates(
    authorization: Optional[str] = Header(None, description="Optional Bearer token for custom templates")
):
    """
    List all available formatting templates.
    If authenticated, also includes user's custom templates.
    """
    template_engine = TemplateEngine()
    templates = template_engine.list_templates()
    
    # If user is authenticated, include their custom templates
    if authorization and authorization.startswith("Bearer "):
        try:
            import httpx
            from services.user_template_store import user_template_store
            
            access_token = authorization.replace("Bearer ", "")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if response.status_code == 200:
                    user_info = response.json()
                    user_email = user_info.get("email")
                    
                    if user_email:
                        custom_templates = user_template_store.get_user_templates(user_email)
                        # Add custom templates to the list
                        for ct in custom_templates:
                            templates.append({
                                "id": ct["id"],
                                "name": ct["name"],
                                "description": f"Custom template from {ct.get('source_filename', 'uploaded document')}",
                                "is_custom": True
                            })
        except Exception:
            # If token validation fails, just return built-in templates
            pass
    
    return {"templates": templates}
