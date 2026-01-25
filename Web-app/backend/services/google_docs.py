"""
Google Docs API service.
Handles reading and writing Google Docs via the official API.
"""

import re
import httpx
from typing import Optional


class GoogleDocsService:
    """Service for interacting with Google Docs API."""
    
    DOCS_API_BASE = "https://docs.googleapis.com/v1/documents"
    
    def __init__(self, access_token: str):
        """Initialize with user's OAuth access token."""
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
    
    def extract_doc_id(self, url: str) -> Optional[str]:
        """
        Extract document ID from various Google Docs URL formats.
        
        Supports:
        - https://docs.google.com/document/d/DOC_ID/edit
        - https://docs.google.com/document/d/DOC_ID/
        - https://docs.google.com/document/d/DOC_ID
        - Just the DOC_ID itself
        """
        # Pattern to match Google Docs URL
        pattern = r'docs\.google\.com/document/d/([a-zA-Z0-9-_]+)'
        match = re.search(pattern, url)
        
        if match:
            return match.group(1)
        
        # Check if it's just a document ID (44 chars, alphanumeric with dashes/underscores)
        if re.match(r'^[a-zA-Z0-9-_]{20,60}$', url):
            return url
        
        return None
    
    async def fetch_document(self, doc_id: str) -> dict:
        """
        Fetch full document content from Google Docs API.
        
        Returns the complete document structure including:
        - Document metadata (title, etc.)
        - Body content (paragraphs, tables, etc.)
        - Styles (fonts, formatting)
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.DOCS_API_BASE}/{doc_id}",
                headers=self.headers,
            )
            
            if response.status_code == 401:
                raise Exception("Access token expired or invalid. Please sign in again.")
            elif response.status_code == 403:
                raise Exception("You don't have permission to access this document.")
            elif response.status_code == 404:
                raise Exception("Document not found. Please check the URL.")
            elif response.status_code != 200:
                raise Exception(f"Failed to fetch document: {response.text}")
            
            return response.json()
    
    def extract_text(self, doc_content: dict) -> str:
        """
        Extract text from document with structure hints for AI.
        
        Preserves information about headings, lists, and tables
        so the AI can better understand the original structure.
        """
        text_parts = []
        body = doc_content.get("body", {})
        content = body.get("content", [])
        
        for element in content:
            if "paragraph" in element:
                paragraph = element["paragraph"]
                paragraph_text = self._get_paragraph_text(paragraph)
                
                if paragraph_text.strip():
                    # Check for heading style
                    style = paragraph.get("paragraphStyle", {}).get("namedStyleType", "")
                    
                    if "HEADING" in style:
                        # Mark headings for AI context
                        text_parts.append(f"[{style}] {paragraph_text}")
                    elif paragraph.get("bullet"):
                        # Mark bullet points
                        text_parts.append(f"• {paragraph_text}")
                    else:
                        text_parts.append(paragraph_text)
                        
            elif "table" in element:
                # Extract table content
                table_text = self._extract_table_text(element["table"])
                if table_text.strip():
                    text_parts.append(f"[TABLE]\n{table_text}\n[/TABLE]")
        
        return "\n".join(text_parts)
    
    def _get_paragraph_text(self, paragraph: dict) -> str:
        """Extract text from a paragraph element."""
        text = ""
        for elem in paragraph.get("elements", []):
            if "textRun" in elem:
                text += elem["textRun"].get("content", "")
        return text.strip()
    
    def _extract_table_text(self, table: dict) -> str:
        """Extract text from a table structure."""
        rows = []
        for row in table.get("tableRows", []):
            cells = []
            for cell in row.get("tableCells", []):
                cell_text = ""
                for content_elem in cell.get("content", []):
                    if "paragraph" in content_elem:
                        cell_text += self._get_paragraph_text(content_elem["paragraph"]) + " "
                cells.append(cell_text.strip())
            if cells:
                rows.append(" | ".join(cells))
        return "\n".join(rows)
    
    async def update_document(self, doc_id: str, requests: list[dict]) -> dict:
        """
        Apply batch updates to a Google Doc.
        
        Uses the documents.batchUpdate endpoint to apply multiple
        changes in a single atomic operation.
        """
        if not requests:
            return {"replies": []}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.DOCS_API_BASE}/{doc_id}:batchUpdate",
                headers=self.headers,
                json={"requests": requests},
            )
            
            if response.status_code == 401:
                raise Exception("Access token expired or invalid. Please sign in again.")
            elif response.status_code == 403:
                raise Exception("You don't have permission to edit this document.")
            elif response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", response.text)
                raise Exception(f"Failed to update document: {error_detail}")
            
            return response.json()
    
    def get_document_end_index(self, doc_content: dict) -> int:
        """
        Get the end index of the document content.
        Needed for calculating insertion points.
        """
        body = doc_content.get("body", {})
        content = body.get("content", [])
        
        if not content:
            return 1
        
        last_element = content[-1]
        return last_element.get("endIndex", 1)
