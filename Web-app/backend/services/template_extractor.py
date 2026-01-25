"""
Template Extractor Service - Enhanced with Structure Extraction

Extracts both STYLES and STRUCTURE from Word (.docx) and PDF files.
- Styles: fonts, sizes, margins, spacing
- Structure: cover page elements, section order, layout patterns
"""

import io
import re
from typing import Optional, List, Dict
from docx import Document
from docx.shared import Pt, Inches, Twips
from docx.enum.text import WD_ALIGN_PARAGRAPH
import pdfplumber
from collections import Counter


class TemplateExtractor:
    """Extracts formatting templates with full structure from documents."""
    
    # Known section patterns for detection
    COVER_PAGE_PATTERNS = [
        r"^(by|prepared by|submitted by|authored by)",
        r"^(under the guidance|guided by|supervisor)",
        r"^(submitted to|submitted for)",
        r"^(department of|college of|university of|school of)",
        r"^(a\.y\.|academic year|year)",
        r"^(report|thesis|dissertation|project)",
        r"^(group|team|batch)",
    ]
    
    BODY_SECTION_PATTERNS = [
        "introduction", "abstract", "background", "theoretical background",
        "literature review", "literature survey", "methodology", "methods",
        "results", "discussion", "analysis", "future scope", "future work",
        "conclusion", "conclusions", "summary", "acknowledgement", "acknowledgments",
        "references", "bibliography", "appendix", "appendices"
    ]
    
    def extract_template(self, file_bytes: bytes, filename: str) -> dict:
        """
        Extract template with both styles and structure.
        """
        filename_lower = filename.lower()
        
        if filename_lower.endswith('.docx'):
            return self._extract_from_docx(file_bytes)
        elif filename_lower.endswith('.pdf'):
            return self._extract_from_pdf(file_bytes)
        else:
            raise ValueError(f"Unsupported file type: {filename}. Only .docx and .pdf are supported.")
    
    def _extract_from_docx(self, file_bytes: bytes) -> dict:
        """Extract template with structure from Word document."""
        doc = Document(io.BytesIO(file_bytes))
        
        # Extract margins
        section = doc.sections[0] if doc.sections else None
        margins = self._extract_margins(section)
        
        # Analyze document formatting
        formatting_data = self._analyze_document_formatting(doc)
        
        # Build styles from formatting
        styles = self._build_styles_from_analysis(formatting_data)
        
        # Extract document STRUCTURE
        structure = self._extract_document_structure(doc, formatting_data)
        
        # Determine primary font
        primary_font = formatting_data.get("primary_font", "Times New Roman")
        
        return {
            "font": primary_font,
            "margins": margins,
            "styles": styles,
            "structure": structure,
            "sections": structure.get("all_sections", []),  # For backward compatibility
            "source_type": "docx"
        }
    
    def _extract_document_structure(self, doc: Document, formatting_data: dict) -> dict:
        """
        Extract the complete document structure:
        - Cover page elements (title, authors, institution, etc.)
        - Body sections (introduction, methodology, etc.)
        """
        paragraphs = formatting_data.get("paragraphs", [])
        
        if not paragraphs:
            return self._get_default_structure()
        
        # Detect if document has a cover page
        cover_elements = []
        body_sections = []
        cover_ended = False
        section_order = 1
        
        # Find the largest font size (likely title)
        max_size = max((p.get("dominant_size", 12) for p in paragraphs), default=24)
        
        # Find body text size (most common)
        all_sizes = formatting_data.get("all_font_sizes", [12])
        body_size = Counter(all_sizes).most_common(1)[0][0] if all_sizes else 12
        
        for i, para in enumerate(paragraphs):
            text = para.get("text", "").strip()
            size = para.get("dominant_size", 12)
            is_bold = para.get("is_bold", False)
            is_italic = para.get("is_italic", False)
            alignment = para.get("alignment", "START")
            
            if not text:
                continue
            
            text_lower = text.lower()
            
            # Check if this is a known body section heading
            is_body_heading = any(
                text_lower.startswith(pattern) or text_lower == pattern
                for pattern in self.BODY_SECTION_PATTERNS
            )
            
            if is_body_heading:
                cover_ended = True
            
            if not cover_ended:
                # Classify as cover page element
                element_type = self._classify_cover_element(text, size, max_size, body_size, is_bold, alignment, i)
                
                if element_type:
                    cover_elements.append({
                        "id": f"cover_{section_order}",
                        "type": element_type,
                        "order": section_order,
                        "sample_text": text[:100],
                        "style": {
                            "fontSize": size,
                            "bold": is_bold,
                            "italic": is_italic,
                            "alignment": alignment
                        }
                    })
                    section_order += 1
                
                # If we've seen many paragraphs of normal text, assume cover ended
                if size == body_size and len(text) > 200:
                    cover_ended = True
            
            if cover_ended or is_body_heading:
                # Check if this is a section heading
                if is_bold and size > body_size and len(text) < 100:
                    body_sections.append({
                        "id": f"body_{section_order}",
                        "name": text[:60],
                        "type": "BODY_SECTION",
                        "order": section_order,
                        "style": {
                            "fontSize": size,
                            "bold": is_bold,
                            "alignment": alignment
                        }
                    })
                    section_order += 1
        
        # Build structure object
        has_cover = len(cover_elements) > 0
        
        # Create combined section list for backward compatibility
        all_sections = []
        for elem in cover_elements:
            all_sections.append({
                "name": elem.get("type", "Cover Element"),
                "style": "TITLE" if elem.get("type") == "MAIN_TITLE" else "NORMAL_TEXT",
                "required": False
            })
        for sect in body_sections:
            all_sections.append({
                "name": sect.get("name", "Section"),
                "style": "HEADING_1",
                "required": True
            })
        
        return {
            "has_cover_page": has_cover,
            "cover_elements": cover_elements,
            "body_sections": body_sections,
            "all_sections": all_sections,
            "detected_type": self._detect_document_type(cover_elements, body_sections)
        }
    
    def _classify_cover_element(self, text: str, size: int, max_size: int, body_size: int, 
                                 is_bold: bool, alignment: str, position: int) -> Optional[str]:
        """Classify a cover page element by its characteristics."""
        text_lower = text.lower().strip()
        
        # Main title - largest font, usually first
        if size == max_size and position < 3:
            return "MAIN_TITLE"
        
        # Author list - contains "by" or multiple names
        if any(pattern in text_lower for pattern in ["by ", "authored by", "prepared by", "submitted by"]):
            return "AUTHOR_INFO"
        
        # Check for numbered list of names (authors)
        if re.match(r'^\d+\.?\s*[A-Z][a-z]+', text):
            return "AUTHOR_LIST"
        
        # Guide/Supervisor info
        if any(pattern in text_lower for pattern in ["guidance", "guided by", "supervisor", "under the"]):
            return "GUIDE_INFO"
        
        # Report type
        if any(pattern in text_lower for pattern in ["report", "thesis", "dissertation", "project", "examination"]):
            return "REPORT_TYPE"
        
        # Subject/Course info
        if any(pattern in text_lower for pattern in ["subject", "course", "submitted for"]):
            return "SUBJECT_INFO"
        
        # Institution
        if any(pattern in text_lower for pattern in ["college", "university", "school", "institute", "department"]):
            return "INSTITUTION"
        
        # Academic year
        if re.match(r'a\.?y\.?\s*\d{4}', text_lower) or "academic year" in text_lower:
            return "ACADEMIC_YEAR"
        
        # Subtitle or secondary title
        if size > body_size and size < max_size and is_bold:
            return "SUBTITLE"
        
        # Centered text on cover page
        if alignment == "CENTER" and size >= body_size:
            return "COVER_TEXT"
        
        return None
    
    def _detect_document_type(self, cover_elements: List, body_sections: List) -> str:
        """Detect the type of document based on structure."""
        element_types = [e.get("type", "") for e in cover_elements]
        section_names = [s.get("name", "").lower() for s in body_sections]
        
        # Check for academic report
        if "GUIDE_INFO" in element_types or "REPORT_TYPE" in element_types:
            return "ACADEMIC_REPORT"
        
        # Check for research paper
        if any("abstract" in n for n in section_names) and any("conclusion" in n for n in section_names):
            return "RESEARCH_PAPER"
        
        # Check for thesis
        if any("literature" in n or "methodology" in n for n in section_names):
            return "THESIS"
        
        return "GENERAL_DOCUMENT"
    
    def _get_default_structure(self) -> dict:
        """Return default structure when extraction fails."""
        return {
            "has_cover_page": False,
            "cover_elements": [],
            "body_sections": [
                {"id": "body_1", "name": "Introduction", "type": "BODY_SECTION", "order": 1},
                {"id": "body_2", "name": "Content", "type": "BODY_SECTION", "order": 2},
                {"id": "body_3", "name": "Conclusion", "type": "BODY_SECTION", "order": 3}
            ],
            "all_sections": [
                {"name": "Title", "style": "TITLE", "required": True},
                {"name": "Introduction", "style": "HEADING_1", "required": True},
                {"name": "Conclusion", "style": "HEADING_1", "required": True}
            ],
            "detected_type": "GENERAL_DOCUMENT"
        }
    
    def _analyze_document_formatting(self, doc: Document) -> dict:
        """Analyze actual formatting in all paragraphs."""
        font_sizes = []
        font_names = {}
        paragraph_data = []
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            para_info = {
                "text": text,
                "text_length": len(text),
                "font_sizes": [],
                "is_bold": False,
                "is_italic": False,
                "is_underline": False,
                "alignment": None,
                "space_before": None,
                "space_after": None,
                "font_name": None
            }
            
            for run in para.runs:
                run_text = run.text.strip()
                if not run_text:
                    continue
                
                if run.font.size:
                    size_pt = int(run.font.size.pt)
                    para_info["font_sizes"].append(size_pt)
                    font_sizes.append(size_pt)
                
                if run.font.name:
                    para_info["font_name"] = run.font.name
                    font_names[run.font.name] = font_names.get(run.font.name, 0) + len(run_text)
                
                if run.bold:
                    para_info["is_bold"] = True
                if run.italic:
                    para_info["is_italic"] = True
                if run.underline:
                    para_info["is_underline"] = True
            
            if para.paragraph_format:
                pf = para.paragraph_format
                if pf.alignment is not None:
                    alignment_map = {
                        WD_ALIGN_PARAGRAPH.LEFT: "START",
                        WD_ALIGN_PARAGRAPH.CENTER: "CENTER",
                        WD_ALIGN_PARAGRAPH.RIGHT: "END",
                        WD_ALIGN_PARAGRAPH.JUSTIFY: "JUSTIFIED"
                    }
                    para_info["alignment"] = alignment_map.get(pf.alignment, "START")
                
                try:
                    if pf.space_before:
                        para_info["space_before"] = int(pf.space_before.pt)
                except:
                    pass
                
                try:
                    if pf.space_after:
                        para_info["space_after"] = int(pf.space_after.pt)
                except:
                    pass
            
            if para_info["font_sizes"]:
                para_info["dominant_size"] = max(set(para_info["font_sizes"]), 
                                                  key=para_info["font_sizes"].count)
            else:
                para_info["dominant_size"] = 12
            
            paragraph_data.append(para_info)
        
        primary_font = max(font_names, key=font_names.get) if font_names else "Times New Roman"
        
        return {
            "paragraphs": paragraph_data,
            "all_font_sizes": font_sizes,
            "primary_font": primary_font
        }
    
    def _build_styles_from_analysis(self, formatting_data: dict) -> dict:
        """Build style definitions from document formatting."""
        paragraphs = formatting_data.get("paragraphs", [])
        all_sizes = formatting_data.get("all_font_sizes", [])
        
        if not paragraphs or not all_sizes:
            return self._get_default_styles()
        
        size_counter = Counter(all_sizes)
        unique_sizes = sorted(set(all_sizes), reverse=True)
        body_size = size_counter.most_common(1)[0][0]
        
        styles = {}
        
        # Title style
        for para in paragraphs:
            if para.get("dominant_size") == unique_sizes[0] if unique_sizes else 24:
                styles["TITLE"] = {
                    "fontSize": para.get("dominant_size", 24),
                    "bold": para.get("is_bold", True),
                    "italic": para.get("is_italic", False),
                    "alignment": para.get("alignment", "CENTER"),
                    "spaceBefore": para.get("space_before", 0),
                    "spaceAfter": para.get("space_after", 24)
                }
                break
        
        if "TITLE" not in styles:
            styles["TITLE"] = {"fontSize": unique_sizes[0] if unique_sizes else 24, "bold": True, "alignment": "CENTER"}
        
        # Heading styles
        for para in paragraphs:
            size = para.get("dominant_size", 12)
            if para.get("is_bold") and size < styles["TITLE"]["fontSize"] and size > body_size:
                if "HEADING_1" not in styles:
                    styles["HEADING_1"] = {
                        "fontSize": size,
                        "bold": True,
                        "alignment": para.get("alignment", "START"),
                        "spaceBefore": para.get("space_before", 18),
                        "spaceAfter": para.get("space_after", 12)
                    }
                elif size < styles["HEADING_1"]["fontSize"] and "HEADING_2" not in styles:
                    styles["HEADING_2"] = {
                        "fontSize": size,
                        "bold": True,
                        "alignment": para.get("alignment", "START"),
                        "spaceBefore": para.get("space_before", 12),
                        "spaceAfter": para.get("space_after", 8)
                    }
        
        if "HEADING_1" not in styles:
            h1_size = (styles["TITLE"]["fontSize"] + body_size) // 2
            styles["HEADING_1"] = {"fontSize": max(h1_size, body_size + 2), "bold": True, "alignment": "START"}
        
        if "HEADING_2" not in styles:
            h2_size = (styles["HEADING_1"]["fontSize"] + body_size) // 2
            styles["HEADING_2"] = {"fontSize": h2_size, "bold": True, "alignment": "START"}
        
        # Normal text
        body_para = None
        for para in paragraphs:
            if para.get("dominant_size") == body_size and len(para.get("text", "")) > 100:
                body_para = para
                break
        
        if body_para:
            styles["NORMAL_TEXT"] = {
                "fontSize": body_size,
                "bold": body_para.get("is_bold", False),
                "alignment": body_para.get("alignment", "JUSTIFIED"),
                "lineSpacing": 1.5,
                "spaceAfter": body_para.get("space_after", 12)
            }
        else:
            styles["NORMAL_TEXT"] = {"fontSize": body_size, "bold": False, "alignment": "JUSTIFIED", "lineSpacing": 1.5}
        
        # Subtitle
        for para in paragraphs:
            if para.get("is_italic") and not para.get("is_bold"):
                styles["SUBTITLE"] = {
                    "fontSize": para.get("dominant_size", 12),
                    "bold": False,
                    "italic": True,
                    "alignment": para.get("alignment", "CENTER")
                }
                break
        
        if "SUBTITLE" not in styles:
            styles["SUBTITLE"] = {"fontSize": body_size, "bold": False, "italic": True, "alignment": "CENTER"}
        
        return styles
    
    def _get_default_styles(self) -> dict:
        """Return default styles."""
        return {
            "TITLE": {"fontSize": 24, "bold": True, "alignment": "CENTER"},
            "HEADING_1": {"fontSize": 16, "bold": True, "alignment": "START"},
            "HEADING_2": {"fontSize": 14, "bold": True, "alignment": "START"},
            "NORMAL_TEXT": {"fontSize": 12, "bold": False, "alignment": "JUSTIFIED", "lineSpacing": 1.5},
            "SUBTITLE": {"fontSize": 12, "italic": True, "alignment": "CENTER"}
        }
    
    def _extract_margins(self, section) -> dict:
        """Extract page margins from document section."""
        if not section:
            return {"top": 72, "bottom": 72, "left": 72, "right": 72}
        
        def emu_to_points(emu):
            if emu is None:
                return 72
            try:
                return int(emu / 12700)
            except:
                return 72
        
        return {
            "top": emu_to_points(section.top_margin),
            "bottom": emu_to_points(section.bottom_margin),
            "left": emu_to_points(section.left_margin),
            "right": emu_to_points(section.right_margin)
        }
    
    def _extract_from_pdf(self, file_bytes: bytes) -> dict:
        """Extract template from PDF document."""
        styles = {}
        font_sizes = []
        fonts_used = {}
        text_blocks = []
        
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages[:5]):
                chars = page.chars
                
                for char in chars:
                    font_name = char.get('fontname', 'Unknown')
                    font_size = char.get('size', 12)
                    
                    fonts_used[font_name] = fonts_used.get(font_name, 0) + 1
                    font_sizes.append(font_size)
        
        if font_sizes:
            size_counter = Counter(font_sizes)
            unique_sizes = sorted(set(font_sizes), reverse=True)
            body_size = size_counter.most_common(1)[0][0]
            
            if unique_sizes:
                styles["TITLE"] = {"fontSize": int(unique_sizes[0]), "bold": True, "alignment": "CENTER"}
            if len(unique_sizes) >= 2:
                styles["HEADING_1"] = {"fontSize": int(unique_sizes[1]), "bold": True, "alignment": "START"}
            if len(unique_sizes) >= 3:
                styles["HEADING_2"] = {"fontSize": int(unique_sizes[2]), "bold": True, "alignment": "START"}
            
            styles["NORMAL_TEXT"] = {"fontSize": int(body_size), "bold": False, "alignment": "JUSTIFIED", "lineSpacing": 1.15}
            styles["SUBTITLE"] = {"fontSize": int(body_size), "italic": True, "alignment": "CENTER"}
        else:
            styles = self._get_default_styles()
        
        primary_font = max(fonts_used, key=fonts_used.get) if fonts_used else "Arial"
        if '+' in primary_font:
            primary_font = primary_font.split('+')[1]
        
        structure = self._get_default_structure()
        
        return {
            "font": primary_font,
            "margins": {"top": 72, "bottom": 72, "left": 72, "right": 72},
            "styles": styles,
            "structure": structure,
            "sections": structure.get("all_sections", []),
            "source_type": "pdf"
        }


# Singleton instance
template_extractor = TemplateExtractor()
