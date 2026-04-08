"""
Instruction Generator for Google Docs API.
Converts AI output into batchUpdate requests with FULL formatting support.
Supports: headings, lists, text styles, alignment, spacing, and more.
"""

import re
from typing import Any


class InstructionGenerator:
    """Generates Google Docs API batchUpdate requests from formatted content."""
    
    # Google Docs named styles mapping
    NAMED_STYLE_MAP = {
        "TITLE": "TITLE",
        "HEADING_1": "HEADING_1",
        "HEADING_2": "HEADING_2",
        "HEADING_3": "HEADING_3",
        "HEADING_4": "HEADING_4",
        "HEADING_5": "HEADING_5",
        "HEADING_6": "HEADING_6",
        "NORMAL_TEXT": "NORMAL_TEXT",
        "SUBTITLE": "SUBTITLE",
    }
    
    # Bullet glyph types
    BULLET_TYPES = {
        "DISC": "GLYPH_TYPE_UNSPECIFIED",  # Default bullet
        "CIRCLE": "HOLLOW_BULLET",
        "SQUARE": "SOLID_SQUARE",
        "DIAMOND": "SOLID_DIAMOND",
        "ARROW": "ARROW",
        "STAR": "STAR",
    }
    
    def generate_requests(
        self,
        ai_result: dict,
        template: dict,
        original_doc: dict
    ) -> list[dict]:
        """
        Generate batchUpdate requests to format a Google Doc with FULL formatting.
        
        Strategy: Clear the document and insert freshly formatted content
        with comprehensive styling.
        """
        requests = []
        
        # Step 1: Calculate document range to clear (preserve first newline)
        body = original_doc.get("body", {})
        content = body.get("content", [])
        
        if len(content) > 1:
            start_index = 1
            end_index = content[-1].get("endIndex", 1) - 1
            
            if end_index > start_index:
                requests.append({
                    "deleteContentRange": {
                        "range": {
                            "startIndex": start_index,
                            "endIndex": end_index
                        }
                    }
                })
        
        # Step 2: Build the formatted content with full styling
        formatted_content = self._build_formatted_content(ai_result, template)
        
        # Step 3: Insert new content at the beginning
        if formatted_content:
            requests.append({
                "insertText": {
                    "location": {"index": 1},
                    "text": formatted_content["text"]
                }
            })
            
            # Step 4: Apply paragraph styles (headings, alignment, spacing)
            for style_request in formatted_content["paragraph_styles"]:
                requests.append(style_request)
            
            # Step 5: Apply text styles (bold, italic, fonts)
            for text_style_request in formatted_content["text_styles"]:
                requests.append(text_style_request)
            
            # Step 6: Apply bullet lists
            for bullet_request in formatted_content["bullets"]:
                requests.append(bullet_request)
        
        # Step 7: Apply double column layout if requested
        columns = template.get("columns", 1)
        if columns > 1 and "columns_break_index" in formatted_content:
            break_idx = formatted_content["columns_break_index"]
            # Only apply if the break index is valid
            if break_idx > 1 and break_idx < len(formatted_content["text"]):
                requests.append({
                    "insertSectionBreak": {
                        "sectionType": "CONTINUOUS",
                        "location": {"index": break_idx}
                    }
                })
                # The section break increases the document length by 1, so the new section starts at break_idx + 1
                col_props = [{"width": {"magnitude": 234, "unit": "PT"}, "paddingEnd": {"magnitude": 18, "unit": "PT"}} for _ in range(columns)]
                col_props[-1].pop("paddingEnd") # Last column has no padding
                
                requests.append({
                    "updateSectionStyle": {
                        "range": {
                            "startIndex": break_idx + 1,
                            "endIndex": break_idx + 1
                        },
                        "sectionStyle": {
                            "columnProperties": col_props
                        },
                        "fields": "columnProperties"
                    }
                })

        # Step 8: Set document margins and page setup
        requests.extend(self._create_page_setup_requests(template))
        
        return requests
    
    def _build_formatted_content(self, ai_result: dict, template: dict) -> dict:
        """
        Build formatted text content with comprehensive styling.
        
        Returns:
            Dict with 'text', 'paragraph_styles', 'text_styles', and 'bullets'
        """
        # Check if this is a custom template with cover page structure
        is_custom = template.get("is_custom", False)
        has_structure = "structure" in template and template.get("structure", {}).get("has_cover_page", False)
        has_cover_data = "cover_page" in ai_result
        
        if is_custom and (has_structure or has_cover_data):
            return self._build_custom_template_content(ai_result, template)
        else:
            return self._build_default_template_content(ai_result, template)
    
    def _build_custom_template_content(self, ai_result: dict, template: dict) -> dict:
        """Build content following custom template structure with cover page."""
        text_parts = []
        paragraph_styles = []
        text_styles = []
        bullets = []
        current_index = 1
        
        template_styles = template.get("styles", {})
        font_family = template.get("font", "Times New Roman")
        structure = template.get("structure", {})
        
        # Get styles
        title_style = template_styles.get("TITLE", {"fontSize": 24, "bold": True, "alignment": "CENTER"})
        heading1_style = template_styles.get("HEADING_1", {"fontSize": 16, "bold": True, "alignment": "START"})
        normal_style = template_styles.get("NORMAL_TEXT", {"fontSize": 12, "alignment": "START", "lineSpacing": 1.5})
        
        # ===== COVER PAGE =====
        cover_page = ai_result.get("cover_page", {})
        
        # Main Title
        main_title = cover_page.get("main_title", ai_result.get("title", "Untitled Document"))
        if main_title:
            title_text = f"{main_title}\n\n"
            text_parts.append(title_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(main_title) + 1,
                "TITLE",
                alignment=title_style.get("alignment", "CENTER"),
                space_after=24
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(main_title),
                font_size=title_style.get("fontSize", 24),
                bold=title_style.get("bold", True),
                font_family=font_family
            ))
            
            current_index += len(title_text)
        
        # Author Info
        author_info = cover_page.get("author_info", "")
        if author_info:
            author_text = f"{author_info}\n\n"
            text_parts.append(author_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(author_text),
                "NORMAL_TEXT",
                alignment="CENTER",
                space_after=12
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(author_info),
                font_size=normal_style.get("fontSize", 12),
                font_family=font_family
            ))
            
            current_index += len(author_text)
        
        # Report Type
        report_type = cover_page.get("report_type", "")
        if report_type:
            report_text = f"{report_type}\n"
            text_parts.append(report_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(report_text),
                "NORMAL_TEXT",
                alignment="CENTER",
                space_after=8
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(report_type),
                font_size=14,
                italic=True,
                font_family=font_family
            ))
            
            current_index += len(report_text)
        
        # Subject Info
        subject_info = cover_page.get("subject_info", "")
        if subject_info:
            subject_text = f"{subject_info}\n"
            text_parts.append(subject_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(subject_text),
                "NORMAL_TEXT",
                alignment="CENTER"
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(subject_info),
                font_size=12,
                font_family=font_family
            ))
            
            current_index += len(subject_text)
        
        # Guide Info
        guide_info = cover_page.get("guide_info", "")
        if guide_info:
            guide_text = f"{guide_info}\n"
            text_parts.append(guide_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(guide_text),
                "NORMAL_TEXT",
                alignment="CENTER"
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(guide_info),
                font_size=12,
                font_family=font_family
            ))
            
            current_index += len(guide_text)
        
        # Institution
        institution = cover_page.get("institution", "")
        if institution:
            inst_text = f"{institution}\n"
            text_parts.append(inst_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(inst_text),
                "NORMAL_TEXT",
                alignment="CENTER"
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(institution),
                font_size=12,
                bold=True,
                font_family=font_family
            ))
            
            current_index += len(inst_text)
        
        # Academic Year
        academic_year = cover_page.get("academic_year", "")
        if academic_year:
            year_text = f"{academic_year}\n\n"
            text_parts.append(year_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(year_text),
                "NORMAL_TEXT",
                alignment="CENTER",
                space_after=24
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(academic_year),
                font_size=12,
                font_family=font_family
            ))
            
            current_index += len(year_text)
        
        # Page break after cover (add extra newlines)
        if cover_page:
            text_parts.append("\n\n")
            current_index += 2
        
        # ===== BODY SECTIONS =====
        sections = ai_result.get("sections", [])
        for section in sections:
            heading = section.get("heading", "Section")
            content = section.get("content", "")
            
            # Section heading
            heading_text = f"{heading}\n"
            text_parts.append(heading_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(heading_text),
                "HEADING_1",
                space_before=heading1_style.get("spaceBefore", 18),
                space_after=heading1_style.get("spaceAfter", 12)
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(heading),
                font_size=heading1_style.get("fontSize", 16),
                bold=heading1_style.get("bold", True),
                font_family=font_family
            ))
            
            current_index += len(heading_text)
            
            # Section content
            if content:
                content_text = f"{content}\n\n"
                text_parts.append(content_text)
                
                paragraph_styles.append(self._create_paragraph_style(
                    current_index,
                    current_index + len(content_text) - 1,
                    "NORMAL_TEXT",
                    line_spacing=normal_style.get("lineSpacing", 1.5),
                    space_after=12,
                    alignment=normal_style.get("alignment", "JUSTIFIED")
                ))
                
                text_styles.append(self._create_text_style(
                    current_index,
                    current_index + len(content),
                    font_size=normal_style.get("fontSize", 12),
                    font_family=font_family
                ))
                
                current_index += len(content_text)
        
        # ===== CONCLUSION =====
        conclusion = ai_result.get("conclusion", "")
        if conclusion:
            conc_heading = "Conclusion\n"
            text_parts.append(conc_heading)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(conc_heading),
                "HEADING_1",
                space_before=18,
                space_after=12
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len("Conclusion"),
                font_size=heading1_style.get("fontSize", 16),
                bold=True,
                font_family=font_family
            ))
            
            current_index += len(conc_heading)
            
            conc_text = f"{conclusion}\n"
            text_parts.append(conc_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(conc_text),
                "NORMAL_TEXT",
                line_spacing=1.5,
                alignment="JUSTIFIED"
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(conclusion),
                font_size=normal_style.get("fontSize", 12),
                font_family=font_family
            ))
        
        return {
            "text": "".join(text_parts),
            "paragraph_styles": paragraph_styles,
            "text_styles": text_styles,
            "bullets": bullets
        }
    
    def _build_default_template_content(self, ai_result: dict, template: dict) -> dict:
        """Build formatted text content with standard academic structure."""
        text_parts = []
        paragraph_styles = []
        text_styles = []
        bullets = []
        current_index = 1  # Google Docs is 1-indexed
        
        title = ai_result.get("title", "Untitled Document")
        authors = ai_result.get("authors", "")
        abstract = ai_result.get("abstract", "")
        keywords = ai_result.get("keywords", "")
        sections = ai_result.get("sections", [])
        conclusion = ai_result.get("conclusion", "")
        
        template_styles = template.get("styles", {})
        font_family = template.get("font", "Times New Roman")
        
        # Get styles from template or use defaults
        title_style = template_styles.get("TITLE", {"fontSize": 24, "bold": True, "alignment": "CENTER"})
        heading1_style = template_styles.get("HEADING_1", {"fontSize": 16, "bold": True, "alignment": "START"})
        heading2_style = template_styles.get("HEADING_2", {"fontSize": 14, "bold": True, "alignment": "START"})
        normal_style = template_styles.get("NORMAL_TEXT", {"fontSize": 12, "alignment": "START", "lineSpacing": 1.5})
        subtitle_style = template_styles.get("SUBTITLE", {"fontSize": 12, "italic": True, "alignment": "START"})
        
        # ===== TITLE =====
        if title:
            title_text = f"{title}\n\n"
            text_parts.append(title_text)
            
            # Title paragraph style - use template alignment
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(title) + 1,
                "TITLE",
                alignment=title_style.get("alignment", "CENTER"),
                space_after=title_style.get("spaceAfter", 24)
            ))
            
            # Title text style - use template font size and bold
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(title),
                font_size=title_style.get("fontSize", 24),
                bold=title_style.get("bold", True),
                font_family=font_family
            ))
            
            current_index += len(title_text)
            
        # ===== AUTHORS =====
        if authors:
            authors_text = f"{authors}\n\n"
            text_parts.append(authors_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(authors_text) - 1,
                "SUBTITLE",
                alignment=subtitle_style.get("alignment", "CENTER"),
                space_after=subtitle_style.get("spaceAfter", 24)
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(authors),
                font_size=subtitle_style.get("fontSize", 12),
                italic=subtitle_style.get("italic", False),
                bold=False,
                font_family=font_family
            ))
            
            current_index += len(authors_text)
        
        # ===== ABSTRACT =====
        if abstract:
            # Abstract content - italic
            abstract_text = f"{abstract}\n\n"
            text_parts.append(abstract_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(abstract_text) - 1,
                "NORMAL_TEXT",
                line_spacing=subtitle_style.get("lineSpacing", normal_style.get("lineSpacing", 1.5)),
                space_after=subtitle_style.get("spaceAfter", 12),
                alignment=subtitle_style.get("alignment", "JUSTIFIED")
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(abstract),
                font_size=subtitle_style.get("fontSize", 12),
                italic=subtitle_style.get("italic", True),
                font_family=font_family
            ))
            
            current_index += len(abstract_text)
            
        # ===== KEYWORDS =====
        if keywords:
            keywords_text = f"{keywords}\n\n"
            text_parts.append(keywords_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(keywords_text) - 1,
                "NORMAL_TEXT",
                line_spacing=normal_style.get("lineSpacing", 1.5),
                space_after=24,
                alignment="START"
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(keywords),
                font_size=normal_style.get("fontSize", 12),
                italic=True,
                bold=False,
                font_family=font_family
            ))
            
            current_index += len(keywords_text)
            
        columns_break_index = current_index
        
        # ===== SECTIONS =====
        for section in sections:
            heading = section.get("heading", "Section")
            content = section.get("content", "")
            
            # Section heading
            heading_text = f"{heading}\n"
            text_parts.append(heading_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(heading_text),
                "HEADING_1",
                space_before=heading1_style.get("spaceBefore", 18),
                space_after=heading1_style.get("spaceAfter", 12)
            ))
            
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(heading),
                font_size=heading1_style.get("fontSize", 16),
                bold=heading1_style.get("bold", True),
                font_family=font_family
            ))
            
            current_index += len(heading_text)
            
            # Section content - check for lists (bullet or numbered)
            if content:
                list_type = self._detect_list_type(content)
                
                if list_type in ("bullet", "numbered"):
                    # Process as list
                    lines = content.split('\n')
                    list_lines = []
                    
                    for line in lines:
                        clean_line = line.strip()
                        # Remove bullet/number prefix
                        if clean_line.startswith(('•', '-', '*', '→')):
                            clean_line = clean_line[1:].strip()
                        elif re.match(r'^\d+[\.\)]\s*', clean_line):
                            clean_line = re.sub(r'^\d+[\.\)]\s*', '', clean_line)
                        if clean_line:
                            list_lines.append(clean_line)
                    
                    for list_line in list_lines:
                        line_text = f"{list_line}\n"
                        text_parts.append(line_text)
                        
                        # Add bullet/number
                        bullets.append({
                            "createParagraphBullets": {
                                "range": {
                                    "startIndex": current_index,
                                    "endIndex": current_index + len(line_text)
                                },
                                "bulletPreset": "NUMBERED_DECIMAL_NESTED" if list_type == "numbered" else "BULLET_DISC_CIRCLE_SQUARE"
                            }
                        })
                        
                        text_styles.append(self._create_text_style(
                            current_index,
                            current_index + len(list_line),
                            font_size=normal_style.get("fontSize", 12),
                            font_family=font_family
                        ))
                        
                        current_index += len(line_text)
                    
                    # Add spacing after list
                    text_parts.append("\n")
                    current_index += 1
                else:
                    # Regular paragraph content
                    content_text = f"{content}\n\n"
                    text_parts.append(content_text)
                    
                    paragraph_styles.append(self._create_paragraph_style(
                        current_index,
                        current_index + len(content_text) - 1,
                        "NORMAL_TEXT",
                        line_spacing=normal_style.get("lineSpacing", 1.5),
                        space_after=normal_style.get("spaceAfter", 12),
                        first_line_indent=36,  # 0.5 inch indent
                        alignment=normal_style.get("alignment", "JUSTIFIED")
                    ))
                    
                    text_styles.append(self._create_text_style(
                        current_index,
                        current_index + len(content),
                        font_size=normal_style.get("fontSize", 12),
                        font_family=font_family
                    ))
                    
                    current_index += len(content_text)
            
            # ===== SUBSECTIONS =====
            subsections = section.get("subsections", [])
            for subsection in subsections:
                sub_heading = subsection.get("heading", "Subsection")
                sub_content = subsection.get("content", "")
                
                # Subsection heading (H2)
                sub_heading_text = f"{sub_heading}\n"
                text_parts.append(sub_heading_text)
                
                paragraph_styles.append(self._create_paragraph_style(
                    current_index,
                    current_index + len(sub_heading_text),
                    "HEADING_2",
                    space_before=heading2_style.get("spaceBefore", 12),
                    space_after=heading2_style.get("spaceAfter", 8)
                ))
                
                text_styles.append(self._create_text_style(
                    current_index,
                    current_index + len(sub_heading),
                    font_size=heading2_style.get("fontSize", 14),
                    bold=heading2_style.get("bold", True),
                    font_family=font_family
                ))
                
                current_index += len(sub_heading_text)
                
                # Subsection content
                if sub_content:
                    sub_content_text = f"{sub_content}\n\n"
                    text_parts.append(sub_content_text)
                    
                    paragraph_styles.append(self._create_paragraph_style(
                        current_index,
                        current_index + len(sub_content_text) - 1,
                        "NORMAL_TEXT",
                        line_spacing=normal_style.get("lineSpacing", 1.5),
                        space_after=normal_style.get("spaceAfter", 10)
                    ))
                    
                    text_styles.append(self._create_text_style(
                        current_index,
                        current_index + len(sub_content),
                        font_size=normal_style.get("fontSize", 12),
                        font_family=font_family
                    ))
                    
                    current_index += len(sub_content_text)
        
        # ===== CONCLUSION =====
        if conclusion:
            # Conclusion content
            conclusion_text = f"{conclusion}\n"
            text_parts.append(conclusion_text)
            
            paragraph_styles.append(self._create_paragraph_style(
                current_index,
                current_index + len(conclusion_text),
                "NORMAL_TEXT",
                line_spacing=normal_style.get("lineSpacing", 1.5),
                space_after=normal_style.get("spaceAfter", 12),
                alignment=normal_style.get("alignment", "JUSTIFIED")
            ))
            
            # Add text style for the conclusion
            text_styles.append(self._create_text_style(
                current_index,
                current_index + len(conclusion),
                font_size=normal_style.get("fontSize", 12),
                font_family=font_family
            ))
            
            current_index += len(conclusion_text)
        
        return {
            "text": "".join(text_parts),
            "paragraph_styles": paragraph_styles,
            "text_styles": text_styles,
            "bullets": bullets,
            "columns_break_index": columns_break_index
        }
    
    def _detect_list_type(self, content: str) -> str:
        """Detect if content contains bullet or numbered lists."""
        lines = content.split('\n')
        for line in lines:
            clean = line.strip()
            if clean.startswith(('•', '-', '*', '→')):
                return "bullet"
            if re.match(r'^\d+[\.)\]]\s', clean):
                return "numbered"
        return "none"
    
    def _create_paragraph_style(
        self,
        start_index: int,
        end_index: int,
        style_name: str,
        alignment: str = None,
        line_spacing: float = None,
        space_before: float = None,
        space_after: float = None,
        first_line_indent: float = None
    ) -> dict:
        """Create a paragraph style update request with full formatting options."""
        named_style = self.NAMED_STYLE_MAP.get(style_name, "NORMAL_TEXT")
        
        paragraph_style = {
            "namedStyleType": named_style
        }
        fields = ["namedStyleType"]
        
        if alignment:
            paragraph_style["alignment"] = alignment
            fields.append("alignment")
        
        if line_spacing:
            paragraph_style["lineSpacing"] = line_spacing * 100  # Convert to percentage
            fields.append("lineSpacing")
        
        if space_before is not None:
            paragraph_style["spaceAbove"] = {"magnitude": space_before, "unit": "PT"}
            fields.append("spaceAbove")
        
        if space_after is not None:
            paragraph_style["spaceBelow"] = {"magnitude": space_after, "unit": "PT"}
            fields.append("spaceBelow")
        
        if first_line_indent is not None:
            paragraph_style["indentFirstLine"] = {"magnitude": first_line_indent, "unit": "PT"}
            fields.append("indentFirstLine")
        
        return {
            "updateParagraphStyle": {
                "range": {
                    "startIndex": start_index,
                    "endIndex": end_index
                },
                "paragraphStyle": paragraph_style,
                "fields": ",".join(fields)
            }
        }
    
    def _create_text_style(
        self,
        start_index: int,
        end_index: int,
        font_size: int = None,
        bold: bool = None,
        italic: bool = None,
        underline: bool = None,
        strikethrough: bool = None,
        font_family: str = None,
        foreground_color: dict = None,
        background_color: dict = None
    ) -> dict:
        """Create a text style update request with full formatting options."""
        text_style = {}
        fields = []
        
        if font_size is not None:
            text_style["fontSize"] = {"magnitude": font_size, "unit": "PT"}
            fields.append("fontSize")
        
        if bold is not None:
            text_style["bold"] = bold
            fields.append("bold")
        
        if italic is not None:
            text_style["italic"] = italic
            fields.append("italic")
        
        if underline is not None:
            text_style["underline"] = underline
            fields.append("underline")
        
        if strikethrough is not None:
            text_style["strikethrough"] = strikethrough
            fields.append("strikethrough")
        
        if font_family is not None:
            text_style["weightedFontFamily"] = {
                "fontFamily": font_family,
                "weight": 400
            }
            fields.append("weightedFontFamily")
        
        if foreground_color is not None:
            text_style["foregroundColor"] = {"color": {"rgbColor": foreground_color}}
            fields.append("foregroundColor")
        
        if background_color is not None:
            text_style["backgroundColor"] = {"color": {"rgbColor": background_color}}
            fields.append("backgroundColor")
        
        if not fields:
            return None
        
        return {
            "updateTextStyle": {
                "range": {
                    "startIndex": start_index,
                    "endIndex": end_index
                },
                "textStyle": text_style,
                "fields": ",".join(fields)
            }
        }
    
    def _create_page_setup_requests(self, template: dict) -> list[dict]:
        """Create page setup requests for margins and orientation."""
        requests = []
        margins = template.get("margins", {})
        
        if margins:
            requests.append({
                "updateDocumentStyle": {
                    "documentStyle": {
                        "marginTop": {"magnitude": margins.get("top", 72), "unit": "PT"},
                        "marginBottom": {"magnitude": margins.get("bottom", 72), "unit": "PT"},
                        "marginLeft": {"magnitude": margins.get("left", 72), "unit": "PT"},
                        "marginRight": {"magnitude": margins.get("right", 72), "unit": "PT"}
                    },
                    "fields": "marginTop,marginBottom,marginLeft,marginRight"
                }
            })
        
        return requests
    
    def create_numbered_list(
        self,
        start_index: int,
        end_index: int,
        list_type: str = "NUMBERED_DECIMAL_NESTED"
    ) -> dict:
        """Create a numbered list request."""
        return {
            "createParagraphBullets": {
                "range": {
                    "startIndex": start_index,
                    "endIndex": end_index
                },
                "bulletPreset": list_type
            }
        }
    
    def create_page_break(self, index: int) -> dict:
        """Create a page break request."""
        return {
            "insertPageBreak": {
                "location": {
                    "index": index
                }
            }
        }
    
    def create_horizontal_rule(self, index: int) -> dict:
        """Create a horizontal rule request."""
        return {
            "insertText": {
                "location": {"index": index},
                "text": "\n"
            }
        }
