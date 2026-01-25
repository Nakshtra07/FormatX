"""
User Template Store Service

Manages user-specific custom templates with file-based storage.
Templates are stored in JSON files organized by user email hash.
"""

import os
import json
import hashlib
import uuid
from datetime import datetime
from typing import List, Optional
from pathlib import Path


class UserTemplateStore:
    """Manages user-specific custom template storage."""
    
    # Maximum templates per user
    MAX_TEMPLATES_PER_USER = 10
    
    def __init__(self, storage_path: str = None):
        """
        Initialize the template store.
        
        Args:
            storage_path: Base path for storing templates. 
                         Defaults to backend/user_templates/
        """
        if storage_path is None:
            # Default to user_templates folder in backend directory
            base_dir = Path(__file__).parent.parent
            storage_path = base_dir / "user_templates"
        
        self.storage_path = Path(storage_path)
        self._ensure_storage_exists()
    
    def _ensure_storage_exists(self):
        """Create storage directory if it doesn't exist."""
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def _get_user_folder(self, user_email: str) -> Path:
        """
        Get the folder path for a user's templates.
        Uses SHA256 hash of email for privacy.
        """
        email_hash = hashlib.sha256(user_email.lower().encode()).hexdigest()[:16]
        user_folder = self.storage_path / email_hash
        user_folder.mkdir(exist_ok=True)
        return user_folder
    
    def _generate_template_id(self) -> str:
        """Generate a unique template ID."""
        return f"custom_{uuid.uuid4().hex[:12]}"
    
    def create_template(
        self, 
        user_email: str, 
        template_name: str, 
        template_data: dict,
        source_filename: str
    ) -> dict:
        """
        Create a new custom template for a user.
        
        Args:
            user_email: User's email address (from OAuth)
            template_name: Display name for the template
            template_data: Extracted template structure
            source_filename: Original filename of uploaded document
            
        Returns:
            dict: Created template with ID and metadata
            
        Raises:
            ValueError: If user has reached template limit
        """
        user_folder = self._get_user_folder(user_email)
        
        # Check template limit
        existing_templates = list(user_folder.glob("*.json"))
        if len(existing_templates) >= self.MAX_TEMPLATES_PER_USER:
            raise ValueError(
                f"Maximum template limit ({self.MAX_TEMPLATES_PER_USER}) reached. "
                "Please delete an existing template first."
            )
        
        # Generate template ID and create full template
        template_id = self._generate_template_id()
        
        full_template = {
            "id": template_id,
            "name": template_name,
            "user_email": user_email,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source_filename": source_filename,
            **template_data
        }
        
        # Save to file
        template_file = user_folder / f"{template_id}.json"
        with open(template_file, 'w', encoding='utf-8') as f:
            json.dump(full_template, f, indent=2, ensure_ascii=False)
        
        return full_template
    
    def get_user_templates(self, user_email: str) -> List[dict]:
        """
        Get all templates for a user.
        
        Args:
            user_email: User's email address
            
        Returns:
            List of template summaries (id, name, created_at, sections count)
        """
        user_folder = self._get_user_folder(user_email)
        templates = []
        
        for template_file in user_folder.glob("*.json"):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    template = json.load(f)
                
                # Return summary (not full template data)
                templates.append({
                    "id": template["id"],
                    "name": template["name"],
                    "created_at": template.get("created_at", ""),
                    "source_filename": template.get("source_filename", ""),
                    "sections_count": len(template.get("sections", [])),
                    "font": template.get("font", "Unknown"),
                    "is_custom": True
                })
            except (json.JSONDecodeError, KeyError):
                # Skip corrupted files
                continue
        
        # Sort by creation date (newest first)
        templates.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return templates
    
    def get_template(self, user_email: str, template_id: str) -> Optional[dict]:
        """
        Get a specific template by ID.
        
        Args:
            user_email: User's email address
            template_id: Template ID to retrieve
            
        Returns:
            Full template data or None if not found
        """
        user_folder = self._get_user_folder(user_email)
        template_file = user_folder / f"{template_id}.json"
        
        if not template_file.exists():
            return None
        
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    
    def delete_template(self, user_email: str, template_id: str) -> bool:
        """
        Delete a template.
        
        Args:
            user_email: User's email address
            template_id: Template ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        user_folder = self._get_user_folder(user_email)
        template_file = user_folder / f"{template_id}.json"
        
        if template_file.exists():
            template_file.unlink()
            return True
        return False
    
    def template_exists(self, user_email: str, template_id: str) -> bool:
        """Check if a template exists for a user."""
        user_folder = self._get_user_folder(user_email)
        template_file = user_folder / f"{template_id}.json"
        return template_file.exists()
    
    def get_template_for_formatting(self, user_email: str, template_id: str) -> Optional[dict]:
        """
        Get template in format suitable for document formatting.
        This converts the stored format to match built-in template format.
        """
        template = self.get_template(user_email, template_id)
        if not template:
            return None
        
        # Convert to format expected by template_engine
        return {
            "id": template["id"],
            "name": template["name"],
            "description": f"Custom template from {template.get('source_filename', 'uploaded document')}",
            "sections": template.get("sections", []),
            "styles": template.get("styles", {}),
            "font": template.get("font", "Arial"),
            "margins": template.get("margins", {"top": 72, "bottom": 72, "left": 72, "right": 72}),
            "structure": template.get("structure", {}),
            "is_custom": True
        }


# Singleton instance
user_template_store = UserTemplateStore()
