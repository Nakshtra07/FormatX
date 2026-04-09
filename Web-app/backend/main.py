"""
AI Document Reformatter - Backend API
FastAPI application that handles Google OAuth, Docs API, and AI formatting.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import auth, documents, custom_templates, payments

# Initialize FastAPI app
app = FastAPI(
    title="AI Document Reformatter",
    description="Transform messy documents into professionally formatted academic papers",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(custom_templates.router, tags=["Custom Templates"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "AI Document Reformatter",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Detailed health check with configuration status."""
    missing = settings.validate()
    return {
        "status": "healthy" if not missing else "degraded",
        "missing_config": missing,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
