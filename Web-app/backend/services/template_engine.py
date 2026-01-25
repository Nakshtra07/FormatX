"""
Template Engine for document formatting.
Manages and applies formatting templates.
"""

import json
from pathlib import Path
from typing import Optional


class TemplateEngine:
    """Manages formatting templates for different document types."""
    
    TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
    
    # Built-in templates - Professional, industry-grade formats
    BUILTIN_TEMPLATES = {
        "ieee_research_paper": {
            "id": "ieee_research_paper",
            "name": "IEEE Research Paper",
            "description": "IEEE-compliant academic research paper format for journals and conferences",
            "sections": [
                {"name": "Title", "style": "TITLE", "required": True},
                {"name": "Authors", "style": "SUBTITLE", "required": True},
                {"name": "Abstract", "style": "NORMAL_TEXT", "required": True},
                {"name": "Keywords", "style": "NORMAL_TEXT", "required": True},
                {"name": "Introduction", "style": "HEADING_1", "required": True},
                {"name": "Related Work", "style": "HEADING_1", "required": False},
                {"name": "Methodology", "style": "HEADING_1", "required": True},
                {"name": "Experimental Setup", "style": "HEADING_1", "required": False},
                {"name": "Results and Discussion", "style": "HEADING_1", "required": True},
                {"name": "Conclusion", "style": "HEADING_1", "required": True},
                {"name": "Future Work", "style": "HEADING_1", "required": False},
                {"name": "Acknowledgments", "style": "HEADING_1", "required": False},
                {"name": "References", "style": "HEADING_1", "required": True},
            ],
            "styles": {
                "TITLE": {
                    "fontSize": 24,
                    "bold": True,
                    "alignment": "CENTER",
                    "spaceAfter": 12
                },
                "SUBTITLE": {
                    "fontSize": 11,
                    "bold": False,
                    "italic": True,
                    "alignment": "CENTER",
                    "spaceAfter": 18
                },
                "HEADING_1": {
                    "fontSize": 12,
                    "bold": True,
                    "alignment": "START",
                    "spaceAfter": 6,
                    "spaceBefore": 12,
                    "allCaps": True
                },
                "HEADING_2": {
                    "fontSize": 11,
                    "bold": True,
                    "italic": True,
                    "alignment": "START",
                    "spaceAfter": 6,
                    "spaceBefore": 10
                },
                "NORMAL_TEXT": {
                    "fontSize": 10,
                    "bold": False,
                    "alignment": "JUSTIFIED",
                    "lineSpacing": 1.0,
                    "spaceAfter": 6,
                    "firstLineIndent": 18
                }
            },
            "font": "Times New Roman",
            "margins": {
                "top": 54,   # 0.75 inch
                "bottom": 54,
                "left": 54,
                "right": 54
            }
        },
        "meeting_minutes": {
            "id": "meeting_minutes",
            "name": "Minutes of Meeting",
            "description": "Professional meeting minutes format for corporate and organizational meetings",
            "sections": [
                {"name": "Meeting Title", "style": "TITLE", "required": True},
                {"name": "Meeting Information", "style": "NORMAL_TEXT", "required": True},
                {"name": "Attendees", "style": "HEADING_1", "required": True},
                {"name": "Absentees", "style": "HEADING_1", "required": False},
                {"name": "Agenda", "style": "HEADING_1", "required": True},
                {"name": "Discussion Points", "style": "HEADING_1", "required": True},
                {"name": "Decisions Made", "style": "HEADING_1", "required": True},
                {"name": "Action Items", "style": "HEADING_1", "required": True},
                {"name": "Next Meeting", "style": "HEADING_1", "required": False},
                {"name": "Adjournment", "style": "HEADING_1", "required": False},
            ],
            "styles": {
                "TITLE": {
                    "fontSize": 18,
                    "bold": True,
                    "alignment": "CENTER",
                    "spaceAfter": 6
                },
                "HEADING_1": {
                    "fontSize": 12,
                    "bold": True,
                    "alignment": "START",
                    "spaceAfter": 6,
                    "spaceBefore": 12,
                    "underline": True
                },
                "HEADING_2": {
                    "fontSize": 11,
                    "bold": True,
                    "alignment": "START",
                    "spaceAfter": 4,
                    "spaceBefore": 8
                },
                "NORMAL_TEXT": {
                    "fontSize": 11,
                    "bold": False,
                    "alignment": "START",
                    "lineSpacing": 1.15,
                    "spaceAfter": 4
                }
            },
            "font": "Arial",
            "margins": {
                "top": 72,
                "bottom": 72,
                "left": 72,
                "right": 72
            }
        },
        "business_proposal": {
            "id": "business_proposal",
            "name": "Business Proposal",
            "description": "Professional business proposal format for clients, investors, and stakeholders",
            "sections": [
                {"name": "Title", "style": "TITLE", "required": True},
                {"name": "Prepared For", "style": "SUBTITLE", "required": True},
                {"name": "Executive Summary", "style": "HEADING_1", "required": True},
                {"name": "Problem Statement", "style": "HEADING_1", "required": True},
                {"name": "Proposed Solution", "style": "HEADING_1", "required": True},
                {"name": "Scope of Work", "style": "HEADING_1", "required": True},
                {"name": "Deliverables", "style": "HEADING_1", "required": True},
                {"name": "Timeline", "style": "HEADING_1", "required": True},
                {"name": "Investment", "style": "HEADING_1", "required": True},
                {"name": "Terms and Conditions", "style": "HEADING_1", "required": False},
                {"name": "Why Choose Us", "style": "HEADING_1", "required": False},
                {"name": "Next Steps", "style": "HEADING_1", "required": True},
                {"name": "Contact Information", "style": "HEADING_1", "required": False},
            ],
            "styles": {
                "TITLE": {
                    "fontSize": 28,
                    "bold": True,
                    "alignment": "CENTER",
                    "spaceAfter": 12
                },
                "SUBTITLE": {
                    "fontSize": 14,
                    "bold": False,
                    "italic": True,
                    "alignment": "CENTER",
                    "spaceAfter": 24
                },
                "HEADING_1": {
                    "fontSize": 14,
                    "bold": True,
                    "alignment": "START",
                    "spaceAfter": 8,
                    "spaceBefore": 16
                },
                "HEADING_2": {
                    "fontSize": 12,
                    "bold": True,
                    "alignment": "START",
                    "spaceAfter": 6,
                    "spaceBefore": 12
                },
                "NORMAL_TEXT": {
                    "fontSize": 11,
                    "bold": False,
                    "alignment": "JUSTIFIED",
                    "lineSpacing": 1.15,
                    "spaceAfter": 6
                }
            },
            "font": "Calibri",
            "margins": {
                "top": 72,
                "bottom": 72,
                "left": 90,  # 1.25 inch for binding
                "right": 72
            }
        }
    }
    
    def load_template(self, template_id: str) -> dict:
        """
        Load a template by ID.
        First checks for JSON file, falls back to built-in templates.
        """
        # Try loading from file
        template_file = self.TEMPLATES_DIR / f"{template_id}.json"
        if template_file.exists():
            with open(template_file, "r") as f:
                return json.load(f)
        
        # Fall back to built-in templates
        if template_id in self.BUILTIN_TEMPLATES:
            return self.BUILTIN_TEMPLATES[template_id]
        
        # Default to ieee_research_paper if template not found
        return self.BUILTIN_TEMPLATES["ieee_research_paper"]
    
    def list_templates(self) -> list[dict]:
        """
        List all available templates with basic info.
        """
        templates = []
        
        # Add built-in templates
        for template_id, template in self.BUILTIN_TEMPLATES.items():
            templates.append({
                "id": template_id,
                "name": template["name"],
                "description": template["description"],
                "section_count": len(template["sections"]),
            })
        
        # Check for additional JSON templates
        if self.TEMPLATES_DIR.exists():
            for file in self.TEMPLATES_DIR.glob("*.json"):
                template_id = file.stem
                if template_id not in self.BUILTIN_TEMPLATES:
                    try:
                        with open(file, "r") as f:
                            template = json.load(f)
                            templates.append({
                                "id": template_id,
                                "name": template.get("name", template_id),
                                "description": template.get("description", ""),
                                "section_count": len(template.get("sections", [])),
                            })
                    except Exception:
                        pass
        
        return templates
    
    def get_section_style(self, template: dict, section_name: str) -> Optional[dict]:
        """
        Get the style configuration for a specific section.
        """
        # Find the section definition
        for section in template.get("sections", []):
            if section["name"].lower() == section_name.lower():
                style_name = section.get("style", "NORMAL_TEXT")
                return template.get("styles", {}).get(style_name)
        
        # Default to normal text style
        return template.get("styles", {}).get("NORMAL_TEXT")
