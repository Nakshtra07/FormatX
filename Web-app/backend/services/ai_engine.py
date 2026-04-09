"""
AI Engine for document processing.
Uses Google Gemini to analyze and restructure document content.
Includes Demo Mode for testing when rate limited.
"""

import json
import re
import google.generativeai as genai
from openai import AsyncOpenAI
import os

from config import settings


class AIEngine:
    """AI-powered document analysis and restructuring engine using Google Gemini."""
    
    SYSTEM_PROMPT = """You are an expert academic document formatter. Your PRIMARY goal is to RESTRUCTURE and FORMAT the document while PRESERVING ALL original content.

CRITICAL RULES:
1. PRESERVE ALL original content - do NOT summarize, shorten, or remove any text
2. Only reorganize and improve formatting, never rewrite content
3. Keep all technical terms, names, numbers, and specific details EXACTLY as written
4. If content is already well-structured, enhance it rather than recreating
5. Every paragraph from the original MUST appear in your output
6. Use standard IEEE format only (not letter format).
7. Remove any letter-style elements (e.g., "Dear...", "Yours sincerely")
8. Keep language formal and academic; avoid repetition.
9. Keep abstract concise (150–250 words). IMPORTANT: Set the abstract content directly as "Abstract—This paper...", using an emdash or hyphen. Do NOT include a space after the emdash/hyphen. Do NOT generate a separate "Abstract" heading. 
10. Keywords should be 3–6 terms and start with "Keywords—" with no space after the emdash/hyphen.
11. Use Roman numerals for all section headings (I, II, III…) EXCEPT for REFERENCES. Section headings MUST be in ALL CAPS.
12. For all references, format them in IEEE style by ensuring all titles are enclosed in quotation marks (e.g., [1] Author, "Title of Paper," Journal, Year).
13. Put the Conclusion section directly inside the "sections" array with the heading "V. CONCLUSION" (or whatever number is appropriate). Do NOT put any title inside the content field for conclusion. Leave the top-level "conclusion" JSON key empty.

FORMATTING TASKS & REQUIRED SECTIONS:
1. Title (centered)
2. Author Name(s), Affiliation, Email
3. Abstract (single paragraph)
4. Keywords (after abstract)
5. I. INTRODUCTION
6. II. PROBLEM STATEMENT (if applicable)
7. III. METHODOLOGY / APPROACH
8. IV. RESULTS / DISCUSSION (if applicable)
9. V. CONCLUSION
10. REFERENCES

You MUST respond with valid JSON in this exact format:
{
    "title": "Clear, Descriptive Document Title",
    "abstract": "Abstract—A 2-4 sentence summary extracted from the document content...",
    "keywords": "Keywords—Term1, Term2, Term3",
    "authors": "John Doe, Tech University, john@example.com",
    "sections": [
        {
            "heading": "I. INTRODUCTION",
            "content": "Full introduction content with all original text..."
        },
        {
            "heading": "V. CONCLUSION",
            "content": "The final conclusion paragraph..."
        },
        {
            "heading": "REFERENCES",
            "content": "[1] Author, \"Title of Reference Document,\" Journal of Research, 2024."
        }
    ],
    "conclusion": ""
}

IMPORTANT: 
- Respond with ONLY the JSON object, no markdown code blocks or extra text
- Ensure all JSON strings are properly escaped (especially quotes and newlines)"""

    def __init__(self):
        """Initialize the AI engine with Gemini and OpenAI clients."""
        if not settings.DEMO_MODE:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
            if settings.OPENAI_API_KEY:
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            else:
                self.openai_client = None
        else:
            self.model = None
            self.openai_client = None
    
    async def process_document(self, text: str, template: dict) -> dict:
        """
        Process document text and restructure according to template.
        
        Args:
            text: Plain text content of the document
            template: Template definition with required sections
            
        Returns:
            Structured document with title, abstract, sections, conclusion
        """
        # DEMO MODE - Force enabled for presentation
        return self._generate_demo_response(text, template)
        
        # Check if this is a custom template with structure
        is_custom = template.get("is_custom", False)
        has_structure = "structure" in template and template["structure"].get("has_cover_page", False)
        
        if is_custom and has_structure:
            # Use structure-aware prompt for custom templates
            user_prompt = self._build_custom_template_prompt(text, template)
        else:
            # Use standard prompt for built-in templates
            template_sections = template.get("sections", [])
            section_names = [s["name"] for s in template_sections]
            
            user_prompt = f"""{self.SYSTEM_PROMPT}

Please restructure the following document into a {template.get('name', 'academic')} format.

Required sections for this template: {', '.join(section_names)}

Document content (preserve ALL of this content in your output):
---
{text[:25000]}
---

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanation, just the JSON object."""

        try:
            try:
                response = self.model.generate_content(
                    user_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,  # Lower for consistent output
                        max_output_tokens=8000,  # Higher for longer documents
                    )
                )
                content = response.text.strip()
            except Exception as gemini_err:
                if self.openai_client:
                    try:
                        # Fallback to OpenAI
                        completion = await self.openai_client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {"role": "system", "content": "You are a specialized JSON AI Engine. Output purely strictly valid JSON."},
                                {"role": "user", "content": user_prompt}
                            ],
                            temperature=0.1,
                            max_tokens=8000,
                            response_format={"type": "json_object"}
                        )
                        content = completion.choices[0].message.content.strip()
                    except Exception as openai_err:
                        raise Exception(f"Gemini failed: {str(gemini_err)} | OpenAI Fallback failed: {str(openai_err)}")
                else:
                    raise gemini_err
            
            # Robust JSON extraction
            content = self._extract_json(content)
            
            # Parse the JSON response
            result = json.loads(content)
            
            # Validate required fields
            if "title" not in result:
                result["title"] = "Untitled Document"
            if "abstract" not in result:
                result["abstract"] = ""
            if "keywords" not in result:
                result["keywords"] = ""
            if "authors" not in result:
                result["authors"] = ""
            if "sections" not in result:
                result["sections"] = []
            if "conclusion" not in result:
                result["conclusion"] = ""
            
            return result
            
        except json.JSONDecodeError as e:
            raise Exception(f"AI returned invalid JSON: {str(e)}")
        except Exception as e:
            raise Exception(f"AI processing failed: {str(e)}")
    
    def _extract_json(self, content: str) -> str:
        """Extract JSON from AI response, handling markdown code blocks."""
        content = content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            # Try to extract content between code blocks
            lines = content.split("\n")
            json_lines = []
            in_block = False
            for line in lines:
                if line.strip().startswith("```"):
                    in_block = not in_block
                    continue
                if in_block:
                    json_lines.append(line)
            if json_lines:
                content = "\n".join(json_lines).strip()
        
        # Fallback: use regex to find JSON object
        if not content.startswith("{"):
            match = re.search(r'\{[\s\S]*\}', content)
            if match:
                content = match.group(0)
        
        # Clean up common issues
        content = content.replace('\r\n', '\n')
        
        return content
    
    def _build_custom_template_prompt(self, text: str, template: dict) -> str:
        """Build a structure-aware prompt for custom templates."""
        structure = template.get("structure", {})
        cover_elements = structure.get("cover_elements", [])
        body_sections = structure.get("body_sections", [])
        doc_type = structure.get("detected_type", "GENERAL_DOCUMENT")
        
        # Build cover page instructions
        cover_instructions = ""
        if cover_elements:
            cover_instructions = "COVER PAGE ELEMENTS (extract these from the document):\n"
            for elem in cover_elements:
                elem_type = elem.get("type", "UNKNOWN")
                sample = elem.get("sample_text", "")[:50]
                cover_instructions += f"  - {elem_type}: Example from source: \"{sample}...\"\n"
        
        # Build body section instructions
        section_instructions = "BODY SECTIONS (in this exact order):\n"
        for sect in body_sections:
            section_instructions += f"  - {sect.get('name', 'Section')}\n"
        
        # Custom JSON format for structured documents
        custom_format = """
{
    "cover_page": {
        "main_title": "The main title extracted from document",
        "author_info": "Author names and affiliations",
        "report_type": "Type of report/document",
        "subject_info": "Subject or course information",
        "guide_info": "Supervisor/guide information",
        "institution": "College/University name",
        "academic_year": "Academic year if present"
    },
    "body": {
        "title_of_project": "Project title section content...",
        "sections": [
            {
                "heading": "Section Name from template",
                "content": "Full section content..."
            }
        ]
    },
    "conclusion": "Conclusion content...",
    "acknowledgement": "Acknowledgement if present...",
    "references": "References if present..."
}"""
        
        prompt = f"""You are formatting a document using a CUSTOM TEMPLATE.

DOCUMENT TYPE: {doc_type}

{cover_instructions}

{section_instructions}

CRITICAL RULES:
1. PRESERVE ALL original content - do NOT summarize or shorten
2. Structure the output following the template's exact section order
3. Extract cover page information accurately from the document
4. Map content to the body sections defined above
5. Keep all names, dates, and specific details EXACTLY as written

RESPOND WITH THIS JSON FORMAT:
{custom_format}

Document content to format:
---
{text[:25000]}
---

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanation."""
        
        return prompt
    
    def _generate_demo_response(self, text: str, template: dict) -> dict:
        """Generate a professional demo response without calling AI API."""
        template_id = template.get("id", "")
        
        # Check if this is a custom template
        if template_id.startswith("custom_"):
            return self._get_custom_template_demo(text, template)
        
        # Return template-specific demo content
        if template_id == "business_proposal":
            return self._get_business_proposal_demo()
        elif template_id == "meeting_minutes":
            return self._get_meeting_minutes_demo(text)
        elif template_id == "ieee_research_paper":
            return self._get_research_paper_demo(text)
        else:
            # Generic fallback
            return self._get_generic_demo(text, template)
    
    def _get_custom_template_demo(self, text: str, template: dict) -> dict:
        """Generate demo response for custom templates with structure."""
        structure = template.get("structure", {})
        cover_elements = structure.get("cover_elements", [])
        body_sections = structure.get("body_sections", [])
        
        # Parse the input text to extract relevant parts
        lines = text.split('\n')
        
        # Try to extract title (first non-empty line)
        title = "Document Title"
        for line in lines[:10]:
            if line.strip() and len(line.strip()) > 5:
                title = line.strip()[:100]
                break
        
        # Build cover_page data
        cover_page = {
            "main_title": title,
            "author_info": "",
            "report_type": "",
            "subject_info": "",
            "guide_info": "",
            "institution": "",
            "academic_year": ""
        }
        
        # Try to extract cover info from text
        for line in lines[:50]:
            line_lower = line.lower()
            if "by" in line_lower and "group" in line_lower:
                cover_page["author_info"] = line.strip()
            elif "report" in line_lower or "examination" in line_lower:
                cover_page["report_type"] = line.strip()
            elif "subject" in line_lower:
                cover_page["subject_info"] = line.strip()
            elif "guidance" in line_lower or "guide" in line_lower:
                cover_page["guide_info"] = line.strip()
            elif "college" in line_lower or "university" in line_lower:
                cover_page["institution"] = line.strip()
            elif "a.y." in line_lower or "academic year" in line_lower:
                cover_page["academic_year"] = line.strip()
        
        # Build body sections from detected structure
        sections = []
        for sect in body_sections:
            sect_name = sect.get("name", "Section")
            # Try to find this section in the text
            content = f"Content for {sect_name} section. This is demo mode - actual content would be extracted by AI."
            
            # Search for section heading in text
            for i, line in enumerate(lines):
                if sect_name.lower() in line.lower():
                    # Extract content after this line
                    next_lines = lines[i+1:i+10]
                    if next_lines:
                        content = " ".join([l.strip() for l in next_lines if l.strip()])[:500]
                    break
            
            sections.append({
                "heading": sect_name,
                "content": content
            })
        
        # If no sections detected, create generic ones
        if not sections:
            sections = [
                {"heading": "Introduction", "content": text[:1000]},
                {"heading": "Content", "content": text[1000:3000] if len(text) > 1000 else "Main content..."},
            ]
        
        return {
            "title": title,
            "abstract": "",
            "cover_page": cover_page,
            "sections": sections,
            "conclusion": "Document formatted successfully in demo mode."
        }
    
    def _get_business_proposal_demo(self) -> dict:
        """Return a complete business proposal demo with substantial content."""
        return {
            "title": "Digital Transformation Solution Proposal",
            "abstract": "Prepared for: TechCorp Industries Ltd.\nDate: January 2025\nProposal Reference: INV-2025-0042\nPrepared by: InnovateTech Solutions Pvt. Ltd.",
            "sections": [
                {
                    "heading": "Executive Summary",
                    "content": "InnovateTech Solutions is pleased to present this comprehensive digital transformation proposal for TechCorp Industries. After careful analysis of your current operational challenges and strategic objectives, we have developed a tailored solution that addresses your immediate pain points while positioning your organization for sustainable long-term growth.\n\nThis proposal outlines a strategic three-phase approach to modernize your legacy infrastructure, implement cloud-based solutions, and deploy intelligent automation tools across your operations. Our recommended solution leverages industry-leading technologies including Amazon Web Services, Salesforce integration, and custom AI-powered analytics.\n\nThe total investment for this initiative is $185,000, with a projected return on investment of 340% over a three-year period. Based on our analysis, TechCorp can expect to realize annual cost savings of approximately $127,000 through reduced manual labor, improved operational efficiency, and decreased system downtime. Implementation will be completed within 8 months, with minimal disruption to your ongoing business activities."
                },
                {
                    "heading": "Problem Statement",
                    "content": "Our discovery sessions and stakeholder interviews have identified several critical challenges that are significantly impacting TechCorp's operational efficiency, customer satisfaction, and competitive positioning:\n\n• Legacy System Inefficiency: Your current ERP system, installed in 2012, operates at only 67% efficiency compared to modern alternatives. This results in an estimated 23% productivity loss across departments, translating to approximately 4,200 lost work hours annually.\n\n• Manual Process Overhead: Critical business processes including inventory reconciliation, order processing, and financial reporting require extensive manual intervention. Your team currently spends an average of 15+ hours per week on redundant data entry tasks that could be fully automated.\n\n• Data Silos and Integration Gaps: Information is fragmented across four disconnected systems—your legacy ERP, standalone CRM, warehouse management spreadsheets, and accounting software. This fragmentation prevents real-time visibility into operations and delays decision-making by an average of 3-5 business days.\n\n• Security Vulnerabilities: The aging infrastructure presents significant cybersecurity risks. The security audit conducted in Q3 2024 identified 23 critical vulnerabilities, including unpatched servers, weak authentication protocols, and inadequate backup procedures.\n\n• Scalability Constraints: Your current infrastructure cannot support projected growth. With your expansion into two new markets planned for 2026, the existing systems will be unable to handle the anticipated 150% increase in transaction volume without major performance degradation."
                },
                {
                    "heading": "Proposed Solution",
                    "content": "Our solution architecture is designed to address each identified challenge while providing a foundation for future innovation and growth. The implementation consists of three integrated phases:\n\n1. Infrastructure Modernization (Phase 1)\nMigration of all critical systems to Amazon Web Services cloud infrastructure. This includes setting up a Virtual Private Cloud with proper security groups, deploying managed database services (RDS for PostgreSQL), and implementing auto-scaling capabilities. The cloud architecture ensures 99.9% uptime and eliminates the need for on-premises server maintenance.\n\n2. Process Automation Platform (Phase 2)\nDeployment of an intelligent workflow automation system powered by custom machine learning models. This platform will automate inventory management, order processing, invoice generation, and customer communications. Integration with your existing Shopify storefront and QuickBooks accounting system ensures seamless data flow across all business functions.\n\n3. Business Intelligence Dashboard (Phase 3)\nImplementation of a real-time analytics platform that consolidates data from all sources into unified, actionable insights. The executive dashboard will display 25+ key performance indicators including sales trends, inventory turnover, customer satisfaction scores, and financial metrics. Automated reporting will replace manual monthly report generation.\n\nThis comprehensive approach ensures minimal disruption to ongoing operations while maximizing the transformational impact of your technology investment."
                },
                {
                    "heading": "Scope of Work",
                    "content": "The engagement encompasses the following deliverables and activities:\n\nDiscovery and Planning\n• Comprehensive current-state assessment including infrastructure audit, process mapping, and stakeholder interviews\n• Gap analysis comparing existing capabilities against industry best practices and your strategic objectives\n• Detailed solution architecture design with technical specifications, integration diagrams, and data flow documentation\n• Risk assessment and mitigation planning with contingency procedures\n\nDevelopment and Implementation\n• AWS cloud infrastructure provisioning and configuration including VPC, subnets, security groups, and IAM policies\n• Legacy system data extraction, cleansing, transformation, and migration with zero data loss guarantee\n• Custom API development for integration between cloud platform, Shopify, QuickBooks, and third-party services\n• Automation workflow configuration for 12 core business processes\n• Business intelligence dashboard development with role-based access controls\n\nTraining and Change Management\n• Development of comprehensive training curriculum tailored to different user roles\n• Delivery of 40 hours of hands-on training sessions per department\n• Creation of video tutorial library (20+ videos) for ongoing reference\n• Change management support including communication templates and adoption tracking\n\nOngoing Support\n• 12-month post-implementation technical support with guaranteed 4-hour response time for critical issues\n• Monthly system health reviews and optimization recommendations\n• Quarterly business reviews to assess ROI and identify additional improvement opportunities"
                },
                {
                    "heading": "Deliverables",
                    "content": "Upon successful completion of this engagement, TechCorp Industries will receive:\n\n1. Cloud Infrastructure\n• Fully configured AWS environment with production, staging, and development instances\n• Automated backup systems with 30-day retention and disaster recovery capabilities\n• SSL certificates and security configurations meeting SOC 2 compliance requirements\n\n2. Integrated Business Platform\n• Unified data platform connecting all business systems with real-time synchronization\n• Automated workflow engine handling inventory, orders, invoicing, and customer communications\n• Mobile-responsive web application for staff access from any device\n• Native mobile app for warehouse team with barcode scanning capabilities\n\n3. Analytics and Reporting\n• Executive dashboard with 25+ KPI visualizations and drill-down capabilities\n• Automated daily, weekly, and monthly report generation and distribution\n• Custom report builder for ad-hoc analysis requirements\n• Predictive analytics models for demand forecasting and inventory optimization\n\n4. Documentation and Training Materials\n• Technical architecture documentation and system runbooks\n• User guides for each role (executive, operations, warehouse, finance)\n• Video tutorial library accessible via company intranet\n• Administrator training for internal IT team\n\n5. Support Services\n• Dedicated support portal for ticket submission and tracking\n• Direct access to technical team via phone and email during business hours\n• After-hours emergency support for critical system issues"
                },
                {
                    "heading": "Timeline",
                    "content": "The project will be executed over an 8-month period according to the following schedule:\n\nPhase 1: Discovery and Planning (Weeks 1-6)\n• Week 1-2: Kickoff, stakeholder interviews, infrastructure audit\n• Week 3-4: Process mapping, gap analysis, requirements documentation\n• Week 5-6: Solution design, architecture review, project plan finalization\n• Milestone: Signed-off Solution Design Document\n\nPhase 2: Development and Migration (Weeks 7-22)\n• Week 7-10: Cloud infrastructure setup, security configuration\n• Week 11-14: Data migration preparation, cleansing, and test migrations\n• Week 15-18: Integration development, API configuration, automation workflows\n• Week 19-22: Dashboard development, testing, and refinement\n• Milestone: System Ready for User Acceptance Testing\n\nPhase 3: Testing and Training (Weeks 23-28)\n• Week 23-24: User acceptance testing with key stakeholders\n• Week 25-26: Bug fixes, performance optimization, security review\n• Week 27-28: Staff training delivery, documentation finalization\n• Milestone: Training Completion Certification\n\nPhase 4: Go-Live and Optimization (Weeks 29-32)\n• Week 29: Production deployment, data cutover\n• Week 30-31: Hypercare support, issue resolution, performance monitoring\n• Week 32: Project closure, handover to support team, lessons learned\n• Milestone: Project Acceptance Sign-off\n\nMilestone review meetings will be conducted at the end of each phase with project sponsors to review progress, address concerns, and confirm readiness to proceed."
                },
                {
                    "heading": "Investment",
                    "content": "The total investment for this digital transformation initiative is $185,000 USD, broken down as follows:\n\nProject Cost Breakdown:\n\n• Infrastructure and Cloud Setup: $45,000\n  - AWS environment provisioning and configuration\n  - Security infrastructure and SSL certificates\n  - Disaster recovery and backup systems\n\n• Development and Integration: $78,000\n  - Custom API development\n  - Automation workflow configuration\n  - Dashboard and analytics platform\n  - Mobile application development\n\n• Data Migration Services: $12,000\n  - Data extraction and cleansing\n  - Migration execution and validation\n  - Legacy system decommissioning support\n\n• Training and Change Management: $22,000\n  - Training curriculum development\n  - Delivery of training sessions\n  - Video tutorial production\n  - Change management support\n\n• Project Management: $18,000\n  - Dedicated project manager\n  - Regular status reporting\n  - Risk and issue management\n\n• Contingency Reserve (8%): $10,000\n  - Buffer for unforeseen requirements\n  - Scope change accommodation\n\nOngoing Costs (Year 1):\n• AWS hosting: ~$1,200/month ($14,400 annually)\n• Support services: $18,000/year (included in first year)\n• Software licensing: $4,800/year\n\nPayment Schedule:\n• 30% upon contract signing: $55,500\n• 40% upon Phase 2 completion: $74,000\n• 30% upon final acceptance: $55,500"
                },
                {
                    "heading": "Why Choose Us",
                    "content": "InnovateTech Solutions brings unparalleled expertise and commitment to this engagement:\n\nProven Track Record\n• 12+ years of enterprise digital transformation experience\n• 200+ successful implementations across manufacturing, retail, and distribution sectors\n• 98% project success rate with on-time and on-budget delivery\n• Average client satisfaction score of 4.8/5.0\n\nTechnical Excellence\n• AWS Advanced Consulting Partner with certified cloud architects\n• Salesforce Silver Partner with integration specialists\n• Microsoft Gold Partner for enterprise solutions\n• Team includes 3 certified PMP project managers\n\nIndustry Recognition\n• Named Top 10 Digital Transformation Consultancy 2024 by TechReview\n• Winner, Best SMB Solution at Cloud Innovation Awards 2023\n• ISO 27001 certified for information security management\n\nOur Commitment to You\n• Dedicated team of 8 specialists assigned exclusively to your project\n• Local presence enables regular on-site collaboration when needed\n• Transparent communication with weekly status updates and open access to project management tools\n• No-surprise pricing with fixed-fee engagement model\n• 24/7 support availability during critical phases"
                },
                {
                    "heading": "Next Steps",
                    "content": "To proceed with this digital transformation initiative, we recommend the following immediate actions:\n\n1. Proposal Review Meeting\nSchedule a 60-minute call with your leadership team to walk through this proposal, answer questions, and discuss any modifications to scope or approach. We are available any day next week.\n\n2. Statement of Work Finalization\nUpon verbal approval, we will prepare a detailed Statement of Work (SOW) including specific deliverables, acceptance criteria, and contractual terms for legal review.\n\n3. Contract Execution\nSign the SOW and Master Services Agreement. Process initial payment of $55,500 (30%) to initiate project activities.\n\n4. Project Kickoff\nWithin 5 business days of contract execution, we will conduct an on-site kickoff meeting with all key stakeholders. This session will introduce the project team, review the detailed project plan, and begin Phase 1 discovery activities.\n\n5. System Access Provisioning\nProvide our team with necessary access credentials to existing systems for assessment purposes. We will provide a detailed access requirements list and sign appropriate NDAs.\n\nContact Information:\n\nPriya Sharma, Solutions Director\nEmail: priya.sharma@innovatetech.io\nPhone: +1 (555) 123-4567\n\nRaj Patel, Account Executive\nEmail: raj.patel@innovatetech.io\nPhone: +1 (555) 234-5678\n\nWe look forward to the opportunity to partner with TechCorp Industries on this transformational journey."
                }
            ],
            "conclusion": "InnovateTech Solutions is confident that this digital transformation initiative will position TechCorp Industries as a technology leader in your sector. Our proven methodology, experienced team, and commitment to your success ensure that you will realize the full value of this investment. We are prepared to begin immediately upon your approval and look forward to building a long-term strategic partnership with your organization."
        }
    
    def _get_meeting_minutes_demo(self, text: str = "") -> dict:
        """
        Intelligent Meeting Minutes formatter that works WITHOUT AI.
        Parses raw text using pattern matching and keyword detection to
        organize content into professional meeting minutes format.
        """
        # If no text provided, return sample demo
        if not text or len(text.strip()) < 50:
            return self._get_meeting_minutes_sample()
        
        # Parse the raw text intelligently
        return self._parse_meeting_content(text)
    
    def _get_meeting_minutes_sample(self) -> dict:
        """Return a sample meeting minutes for empty/short content."""
        return {
            "title": "Weekly Product Team Meeting",
            "abstract": "Date: January 24, 2025\nTime: 10:00 AM - 11:30 AM\nLocation: Conference Room B / Zoom\nMeeting Called By: Sarah Johnson, Product Manager",
            "sections": [
                {
                    "heading": "Attendees",
                    "content": "• Sarah Johnson (Product Manager) - Chair\n• Mike Chen (Lead Developer)\n• Emily Davis (UX Designer)\n• James Wilson (QA Lead)\n• Lisa Brown (Marketing)"
                },
                {
                    "heading": "Agenda",
                    "content": "1. Q1 Product Roadmap Review\n2. Sprint 14 Retrospective\n3. Customer Feedback Analysis\n4. Resource Allocation for Q2\n5. Open Discussion"
                },
                {
                    "heading": "Discussion Points",
                    "content": "Sprint 14 delivered 3 major features on time. Customer satisfaction scores improved by 12%. The mobile app redesign received positive beta feedback. Budget constraints require prioritizing features for Q2."
                },
                {
                    "heading": "Decisions Made",
                    "content": "1. Approved: Mobile app v2.0 launch date set for March 15\n2. Approved: Hiring 2 additional developers for Q2\n3. Deferred: Enterprise API expansion (pending budget review)\n4. Approved: New customer onboarding flow design"
                },
                {
                    "heading": "Action Items",
                    "content": "• Mike Chen: Complete API documentation by Feb 1\n• Emily Davis: Finalize onboarding mockups by Jan 28\n• James Wilson: Set up automated testing pipeline by Feb 5\n• Lisa Brown: Prepare launch marketing materials by Mar 1"
                },
                {
                    "heading": "Next Meeting",
                    "content": "Date: January 31, 2025\nTime: 10:00 AM\nLocation: Conference Room B\nAgenda: Sprint 15 Planning, Q2 Budget Review"
                }
            ],
            "conclusion": "Meeting adjourned at 11:25 AM. Minutes recorded by Sarah Johnson."
        }
    
    def _parse_meeting_content(self, text: str) -> dict:
        """
        Parse raw meeting content into structured format using pattern matching.
        This works WITHOUT AI - uses keyword detection and text analysis.
        """
        lines = text.strip().split('\n')
        
        # Initialize containers
        title = ""
        meeting_info = []
        attendees = []
        absentees = []
        agenda = []
        discussions = []
        decisions = []
        action_items = []
        next_meeting = []
        other_content = []
        
        # Keywords for section detection
        attendee_keywords = ['attendee', 'present', 'attended', 'participants', 'members present', 'who was there', 'people in the meeting']
        absent_keywords = ['absent', 'apologies', 'not present', 'couldn\'t make it', 'missing', 'on leave']
        agenda_keywords = ['agenda', 'topics', 'items to discuss', 'discussion points', 'points to cover', 'what we discussed']
        decision_keywords = ['decision', 'agreed', 'approved', 'resolved', 'concluded', 'voted', 'finalized', 'decided']
        action_keywords = ['action', 'task', 'todo', 'to-do', 'follow up', 'follow-up', 'assigned', 'responsible', 'will do', 'needs to']
        next_meeting_keywords = ['next meeting', 'next time', 'scheduled', 'next session', 'reconvene']
        date_keywords = ['date', 'time', 'location', 'venue', 'where', 'when', 'called by', 'chaired by', 'organized by']
        
        current_section = None
        
        for line in lines:
            line_lower = line.lower().strip()
            line_clean = line.strip()
            
            if not line_clean:
                continue
            
            # Detect title (usually first substantial line or contains "meeting" or "minutes")
            if not title and ('meeting' in line_lower or 'minutes' in line_lower or 'mom' in line_lower):
                title = self._clean_title(line_clean)
                continue
            
            # Detect section headers and switch context
            if any(kw in line_lower for kw in attendee_keywords):
                current_section = 'attendees'
                continue
            elif any(kw in line_lower for kw in absent_keywords):
                current_section = 'absentees'
                continue
            elif any(kw in line_lower for kw in agenda_keywords):
                current_section = 'agenda'
                continue
            elif any(kw in line_lower for kw in decision_keywords) and len(line_clean) < 50:
                current_section = 'decisions'
                continue
            elif any(kw in line_lower for kw in action_keywords) and len(line_clean) < 50:
                current_section = 'actions'
                continue
            elif any(kw in line_lower for kw in next_meeting_keywords):
                current_section = 'next_meeting'
                continue
            elif any(kw in line_lower for kw in date_keywords) and len(line_clean) < 100:
                current_section = 'meeting_info'
            
            # Route content to appropriate section
            if current_section == 'attendees':
                attendees.append(self._format_list_item(line_clean))
            elif current_section == 'absentees':
                absentees.append(self._format_list_item(line_clean))
            elif current_section == 'agenda':
                agenda.append(self._format_list_item(line_clean))
            elif current_section == 'decisions':
                decisions.append(self._format_list_item(line_clean))
            elif current_section == 'actions':
                action_items.append(self._format_action_item(line_clean))
            elif current_section == 'next_meeting':
                next_meeting.append(line_clean)
            elif current_section == 'meeting_info':
                meeting_info.append(line_clean)
            else:
                # Smart categorization based on content patterns
                if self._looks_like_person(line_clean):
                    attendees.append(self._format_list_item(line_clean))
                elif self._looks_like_action(line_clean):
                    action_items.append(self._format_action_item(line_clean))
                elif self._looks_like_decision(line_clean):
                    decisions.append(self._format_list_item(line_clean))
                elif self._looks_like_date_info(line_clean):
                    meeting_info.append(line_clean)
                else:
                    discussions.append(line_clean)
        
        # Build the structured output
        sections = []
        
        if attendees:
            sections.append({
                "heading": "Attendees",
                "content": '\n'.join(attendees)
            })
        
        if absentees:
            sections.append({
                "heading": "Absentees",
                "content": '\n'.join(absentees)
            })
        
        if agenda:
            sections.append({
                "heading": "Agenda",
                "content": '\n'.join(f"{i+1}. {item.lstrip('•-* ')}" for i, item in enumerate(agenda))
            })
        
        if discussions:
            sections.append({
                "heading": "Discussion Points",
                "content": self._format_paragraphs(discussions)
            })
        
        if decisions:
            sections.append({
                "heading": "Decisions Made",
                "content": '\n'.join(f"{i+1}. {item.lstrip('•-* ')}" for i, item in enumerate(decisions))
            })
        
        if action_items:
            sections.append({
                "heading": "Action Items",
                "content": '\n'.join(action_items)
            })
        
        if next_meeting:
            sections.append({
                "heading": "Next Meeting",
                "content": '\n'.join(next_meeting)
            })
        
        # Default title if none found
        if not title:
            title = "Meeting Minutes"
        
        # Format meeting info as abstract
        abstract = '\n'.join(meeting_info) if meeting_info else f"Date: {self._get_current_date()}"
        
        return {
            "title": title,
            "abstract": abstract,
            "sections": sections if sections else [{"heading": "Notes", "content": text[:500]}],
            "conclusion": "Meeting adjourned. Minutes prepared for distribution."
        }
    
    def _clean_title(self, text: str) -> str:
        """Clean and format meeting title."""
        # Remove common prefixes
        prefixes = ['minutes of', 'mom:', 'mom -', 'meeting:', 'meeting -']
        text_lower = text.lower()
        for prefix in prefixes:
            if text_lower.startswith(prefix):
                text = text[len(prefix):].strip()
        return text.strip().title() if text else "Meeting Minutes"
    
    def _format_list_item(self, text: str) -> str:
        """Format text as a bullet point."""
        text = text.lstrip('•-*→0123456789.) ')
        return f"• {text}" if text else ""
    
    def _format_action_item(self, text: str) -> str:
        """Format text as an action item with owner and deadline detection."""
        text = text.lstrip('•-*→0123456789.) ')
        
        # Try to detect owner:task pattern
        if ':' in text:
            parts = text.split(':', 1)
            if len(parts[0].split()) <= 4:  # Likely a name
                return f"• {parts[0].strip()}: {parts[1].strip()}"
        
        return f"• {text}"
    
    def _looks_like_person(self, text: str) -> bool:
        """Check if text looks like a person's name/attendance entry."""
        # Short text with name-like patterns
        if len(text) > 100:
            return False
        
        person_indicators = ['@', 'manager', 'director', 'lead', 'head', 'ceo', 'cto', 'cfo', 
                            'engineer', 'developer', 'designer', 'analyst', 'coordinator',
                            'present', 'attended', 'chair']
        text_lower = text.lower()
        
        if any(ind in text_lower for ind in person_indicators):
            return True
        
        # Check if it looks like a name (2-4 capitalized words)
        words = text.split()
        if 1 <= len(words) <= 6:
            capitalized = sum(1 for w in words if w and w[0].isupper())
            if capitalized >= len(words) * 0.5:
                return True
        
        return False
    
    def _looks_like_action(self, text: str) -> bool:
        """Check if text looks like an action item."""
        action_patterns = ['will ', 'should ', 'must ', 'need to ', 'by ', 'deadline', 
                          'complete', 'finish', 'submit', 'prepare', 'send', 'review',
                          'assigned to', 'responsible', 'follow up', 'action:']
        text_lower = text.lower()
        return any(pat in text_lower for pat in action_patterns)
    
    def _looks_like_decision(self, text: str) -> bool:
        """Check if text looks like a decision."""
        decision_patterns = ['agreed', 'decided', 'approved', 'rejected', 'postponed',
                            'deferred', 'resolved', 'concluded', 'voted', 'motion',
                            'passed', 'confirmed', 'finalized']
        text_lower = text.lower()
        return any(pat in text_lower for pat in decision_patterns)
    
    def _looks_like_date_info(self, text: str) -> bool:
        """Check if text contains date/time/location info."""
        date_patterns = ['date:', 'time:', 'location:', 'venue:', 'room', 'zoom', 'teams',
                        'am', 'pm', 'january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december',
                        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                        '2024', '2025', '2026']
        text_lower = text.lower()
        return any(pat in text_lower for pat in date_patterns) and len(text) < 100
    
    def _format_paragraphs(self, lines: list) -> str:
        """Combine discussion lines into readable paragraphs."""
        # Group short lines, keep long ones separate
        result = []
        current_para = []
        
        for line in lines:
            if len(line) < 50 and current_para:
                current_para.append(line)
            else:
                if current_para:
                    result.append(' '.join(current_para))
                    current_para = []
                result.append(line)
        
        if current_para:
            result.append(' '.join(current_para))
        
        return '\n\n'.join(result)
    
    def _get_current_date(self) -> str:
        """Get current date formatted."""
        from datetime import datetime
        return datetime.now().strftime("%B %d, %Y")
    
    def _get_research_paper_demo(self, text: str = "") -> dict:
        """
        Intelligent IEEE Research Paper formatter that works WITHOUT AI.
        Parses raw research content using pattern matching and keyword detection
        to organize content into professional IEEE paper format.
        """
        # If no text provided, return sample demo
        if not text or len(text.strip()) < 100:
            return self._get_research_paper_sample()
        
        # Parse the raw text intelligently
        return self._parse_research_content(text)
    
    def _get_research_paper_sample(self) -> dict:
        """Return a sample IEEE research paper for empty/short content."""
        return {
            "title": "Machine Learning Approaches for Real-Time Anomaly Detection in IoT Networks",
            "abstract": "Authors: J. Smith, A. Kumar, M. Zhang\nDepartment of Computer Science, Tech University\n\nThis paper presents a novel machine learning framework for detecting anomalies in Internet of Things (IoT) networks in real-time. Our approach combines LSTM networks with attention mechanisms to achieve 94.7% detection accuracy while maintaining sub-millisecond latency. Experimental results on benchmark datasets demonstrate significant improvements over existing methods.",
            "keywords": "Keywords—IoT Security, Anomaly Detection, LSTM, Machine Learning, Network Security",
            "sections": [
                {
                    "heading": "Introduction",
                    "content": "The proliferation of IoT devices has created unprecedented security challenges. Traditional intrusion detection systems fail to address the unique characteristics of IoT networks, including resource constraints and heterogeneous protocols. This paper proposes a lightweight yet effective solution for real-time threat detection."
                },
                {
                    "heading": "Related Work",
                    "content": "Previous approaches include signature-based detection [1], statistical methods [2], and deep learning techniques [3]. While effective in controlled environments, these methods suffer from high false positive rates and computational overhead unsuitable for edge deployment."
                },
                {
                    "heading": "Methodology",
                    "content": "Our framework consists of three components:\n1. Feature extraction module using packet-level analysis\n2. LSTM-Attention network for temporal pattern recognition\n3. Lightweight inference engine optimized for edge devices\n\nThe model is trained on 2.5 million network flows from the CICIDS2017 dataset."
                },
                {
                    "heading": "Results and Discussion",
                    "content": "Experimental evaluation shows:\n• Detection Accuracy: 94.7% (±0.3%)\n• False Positive Rate: 2.1%\n• Average Latency: 0.8ms\n• Model Size: 4.2MB (suitable for edge deployment)\n\nOur approach outperforms baseline methods by 8.3% in F1-score."
                },
                {
                    "heading": "Conclusion",
                    "content": "This paper demonstrates that combining LSTM networks with attention mechanisms provides an effective solution for IoT anomaly detection. The proposed framework achieves state-of-the-art performance while meeting real-time constraints necessary for practical deployment."
                },
                {
                    "heading": "References",
                    "content": "[1] A. Kumar et al., 'Signature-based IDS for IoT,' IEEE IoT Journal, 2023.\n[2] M. Zhang, 'Statistical Anomaly Detection,' ACM Computing Surveys, 2022.\n[3] J. Smith, 'Deep Learning for Network Security,' NDSS, 2024."
                }
            ],
            "conclusion": "Future work will focus on federated learning approaches to enable privacy-preserving model updates across distributed IoT deployments."
        }
    
    def _parse_research_content(self, text: str) -> dict:
        """
        Parse raw research content into IEEE format using pattern matching.
        This works WITHOUT AI - uses keyword detection and text analysis.
        """
        lines = text.strip().split('\n')
        
        # Initialize containers
        title = ""
        authors = []
        affiliations = []
        abstract_content = []
        keywords = []
        introduction = []
        literature_review = []
        methodology = []
        results = []
        discussion = []
        conclusion = []
        future_work = []
        references = []
        acknowledgments = []
        other_content = []
        
        # Section header keywords
        title_keywords = ['title', 'paper', 'research', 'study', 'analysis', 'investigation']
        author_keywords = ['author', 'written by', 'by:', 'researchers', 'contributors']
        abstract_keywords = ['abstract', 'summary', 'overview', 'brief']
        keyword_keywords = ['keywords', 'key words', 'index terms', 'tags']
        intro_keywords = ['introduction', 'background', 'overview', 'context', 'motivation']
        lit_review_keywords = ['literature', 'related work', 'previous work', 'prior research', 'existing', 'state of the art']
        method_keywords = ['methodology', 'method', 'approach', 'proposed', 'framework', 'algorithm', 'technique', 'implementation', 'design', 'architecture']
        result_keywords = ['result', 'finding', 'outcome', 'experiment', 'evaluation', 'performance', 'accuracy', 'testing']
        discussion_keywords = ['discussion', 'analysis', 'interpretation', 'implications']
        conclusion_keywords = ['conclusion', 'concluding', 'summary', 'final']
        future_keywords = ['future', 'further work', 'next steps', 'recommendations', 'scope']
        ref_keywords = ['reference', 'bibliography', 'citation', 'sources', 'works cited']
        ack_keywords = ['acknowledgment', 'acknowledgement', 'thanks', 'gratitude', 'funding']
        
        current_section = None
        
        for line in lines:
            line_lower = line.lower().strip()
            line_clean = line.strip()
            
            if not line_clean:
                continue
            
            # Detect title (usually first substantial line)
            if not title and len(line_clean) > 10 and len(line_clean) < 200:
                if any(kw in line_lower for kw in title_keywords) or self._looks_like_title(line_clean):
                    title = self._clean_research_title(line_clean)
                    continue
            
            # Detect section headers and switch context
            if any(kw in line_lower for kw in author_keywords) and len(line_clean) < 50:
                current_section = 'authors'
                continue
            elif (any(kw in line_lower for kw in abstract_keywords) and len(line_clean) < 30) or line_lower.startswith(('abstract—', 'abstract:', 'abstract -')):
                current_section = 'abstract'
                if len(line_clean) >= 30:
                    # Actually contains the abstract content on the same line
                    text_start = line_clean.find('—') if '—' in line_clean else (line_clean.find(':') if ':' in line_clean else line_clean.find('-'))
                    if text_start != -1:
                        abstract_content.append(line_clean[text_start+1:].strip())
                    else:
                        abstract_content.append(line_clean[8:].strip())
                continue
            elif any(kw in line_lower for kw in keyword_keywords) and len(line_clean) < 100:
                current_section = 'keywords'
                if ":" in line_clean or "—" in line_clean:
                    keywords.extend(self._extract_keywords(line_clean))
                continue
            elif any(kw in line_lower for kw in intro_keywords) and len(line_clean) < 50:
                current_section = 'introduction'
                continue
            elif any(kw in line_lower for kw in lit_review_keywords) and len(line_clean) < 50:
                current_section = 'literature'
                continue
            elif any(kw in line_lower for kw in method_keywords) and len(line_clean) < 50:
                current_section = 'methodology'
                continue
            elif any(kw in line_lower for kw in result_keywords) and len(line_clean) < 50:
                current_section = 'results'
                continue
            elif any(kw in line_lower for kw in discussion_keywords) and len(line_clean) < 50:
                current_section = 'discussion'
                continue
            elif any(kw in line_lower for kw in conclusion_keywords) and len(line_clean) < 50:
                current_section = 'conclusion'
                continue
            elif any(kw in line_lower for kw in future_keywords) and len(line_clean) < 50:
                current_section = 'future'
                continue
            elif any(kw in line_lower for kw in ref_keywords) and len(line_clean) < 50:
                current_section = 'references'
                continue
            elif any(kw in line_lower for kw in ack_keywords) and len(line_clean) < 50:
                current_section = 'acknowledgments'
                continue
            
            # Route content to appropriate section
            if current_section == 'authors':
                if self._looks_like_author(line_clean):
                    authors.append(line_clean)
                else:
                    affiliations.append(line_clean)
            elif current_section == 'abstract':
                abstract_content.append(line_clean)
            elif current_section == 'keywords':
                keywords.extend(self._extract_keywords(line_clean))
            elif current_section == 'introduction':
                introduction.append(line_clean)
            elif current_section == 'literature':
                literature_review.append(line_clean)
            elif current_section == 'methodology':
                methodology.append(line_clean)
            elif current_section == 'results':
                results.append(line_clean)
            elif current_section == 'discussion':
                discussion.append(line_clean)
            elif current_section == 'conclusion':
                conclusion.append(line_clean)
            elif current_section == 'future':
                future_work.append(line_clean)
            elif current_section == 'references':
                references.append(self._format_reference(line_clean))
            elif current_section == 'acknowledgments':
                acknowledgments.append(line_clean)
            else:
                # Smart categorization based on content patterns
                if self._looks_like_author(line_clean) and len(authors) < 10:
                    authors.append(line_clean)
                elif self._looks_like_reference(line_clean):
                    references.append(self._format_reference(line_clean))
                elif self._looks_like_methodology(line_clean):
                    methodology.append(line_clean)
                elif self._looks_like_result(line_clean):
                    results.append(line_clean)
                else:
                    other_content.append(line_clean)
        
        # Build the structured output
        sections = []
        
        if introduction or (other_content and not methodology):
            intro_text = introduction if introduction else other_content[:len(other_content)//4]
            sections.append({
                "heading": "I. Introduction",
                "content": self._format_research_paragraphs(intro_text)
            })
        
        if literature_review:
            sections.append({
                "heading": "II. Related Work",
                "content": self._format_research_paragraphs(literature_review)
            })
        
        if methodology:
            sections.append({
                "heading": "III. Methodology",
                "content": self._format_research_paragraphs(methodology)
            })
        
        if results:
            sections.append({
                "heading": "IV. Results and Discussion",
                "content": self._format_research_paragraphs(results + discussion)
            })
        elif discussion:
            sections.append({
                "heading": "IV. Discussion",
                "content": self._format_research_paragraphs(discussion)
            })
        
        if conclusion:
            sections.append({
                "heading": "V. Conclusion",
                "content": self._format_research_paragraphs(conclusion)
            })
        
        if future_work:
            sections.append({
                "heading": "VI. Future Work",
                "content": self._format_research_paragraphs(future_work)
            })
        
        if acknowledgments:
            sections.append({
                "heading": "VII. Acknowledgments",
                "content": ' '.join(acknowledgments)
            })
        
        if references:
            sections.append({
                "heading": "References",
                "content": '\n'.join(references)
            })
        
        # If we couldn't parse properly, create generic sections from content
        if not sections and other_content:
            chunk_size = len(other_content) // 4
            sections = [
                {"heading": "I. Introduction", "content": self._format_research_paragraphs(other_content[:chunk_size])},
                {"heading": "II. Methodology", "content": self._format_research_paragraphs(other_content[chunk_size:chunk_size*2])},
                {"heading": "III. Results and Discussion", "content": self._format_research_paragraphs(other_content[chunk_size*2:chunk_size*3])},
                {"heading": "IV. Conclusion", "content": self._format_research_paragraphs(other_content[chunk_size*3:])}
            ]
        
        # Default title if none found
        if not title:
            title = "Research Paper"
        
        # Build abstract with authors and keywords
        abstract_parts = []
        if authors:
            abstract_parts.append("Authors: " + ", ".join(authors[:5]))
        if affiliations:
            abstract_parts.append(affiliations[0])
        if abstract_content:
            abstract_parts.append('\n' + ' '.join(abstract_content))
        
        abstract_text = '\n'.join(abstract_parts) if abstract_parts else "Abstract not provided."
        
        keywords_text = ""
        if keywords:
            kw_string = ', '.join(keywords[:8])
            if not kw_string.lower().startswith("keywords"):
                keywords_text = f"Keywords—{kw_string}"
            else:
                keywords_text = kw_string
        
        return {
            "title": title,
            "abstract": abstract_text,
            "keywords": keywords_text,
            "sections": sections if sections else [{"heading": "Content", "content": text[:1000]}],
            "conclusion": ' '.join(future_work) if future_work else "Further research is recommended to validate and extend these findings."
        }
    
    def _clean_research_title(self, text: str) -> str:
        """Clean and format research paper title."""
        prefixes = ['title:', 'paper:', 'research:', 'study:']
        text_lower = text.lower()
        for prefix in prefixes:
            if text_lower.startswith(prefix):
                text = text[len(prefix):].strip()
        return text.strip().title() if text else "Research Paper"
    
    def _looks_like_title(self, text: str) -> bool:
        """Check if text looks like a paper title."""
        # Titles are usually 5-20 words, mostly capitalized
        words = text.split()
        if 5 <= len(words) <= 25:
            capitalized = sum(1 for w in words if w and w[0].isupper())
            if capitalized >= len(words) * 0.6:
                return True
        return False
    
    def _looks_like_author(self, text: str) -> bool:
        """Check if text looks like an author name."""
        if len(text) > 100:
            return False
        
        # Author patterns: names with titles, affiliations, emails
        author_indicators = ['dr.', 'prof.', 'ph.d', 'professor', '@', 'university', 
                           'institute', 'college', 'department', 'research']
        text_lower = text.lower()
        
        if any(ind in text_lower for ind in author_indicators):
            return True
        
        # Check for name pattern (2-4 words, mostly capitalized)
        words = text.split()
        if 2 <= len(words) <= 5:
            capitalized = sum(1 for w in words if w and w[0].isupper())
            if capitalized >= len(words) * 0.7:
                return True
        
        return False
    
    def _looks_like_reference(self, text: str) -> bool:
        """Check if text looks like a reference/citation."""
        ref_patterns = ['[1]', '[2]', '[3]', '[4]', '[5]', 'et al', 'journal', 
                       'conference', 'proceedings', 'ieee', 'acm', 'springer',
                       'vol.', 'pp.', 'doi:', 'arxiv', 'http']
        text_lower = text.lower()
        return any(pat in text_lower for pat in ref_patterns)
    
    def _looks_like_methodology(self, text: str) -> bool:
        """Check if text looks like methodology content."""
        method_patterns = ['algorithm', 'approach', 'method', 'technique', 'model',
                          'framework', 'architecture', 'implement', 'design', 'develop',
                          'propose', 'use', 'apply', 'dataset', 'training', 'parameters']
        text_lower = text.lower()
        return sum(1 for pat in method_patterns if pat in text_lower) >= 2
    
    def _looks_like_result(self, text: str) -> bool:
        """Check if text looks like results content."""
        result_patterns = ['%', 'accuracy', 'precision', 'recall', 'f1', 'performance',
                          'table', 'figure', 'graph', 'shows', 'demonstrates', 'achieves',
                          'compared', 'baseline', 'improvement', 'experiment']
        text_lower = text.lower()
        return sum(1 for pat in result_patterns if pat in text_lower) >= 2
    
    def _extract_keywords(self, text: str) -> list:
        """Extract keywords from text."""
        # Remove common prefixes
        text = text.replace('keywords:', '').replace('key words:', '').strip()
        # Split by comma, semicolon, or dash
        import re
        keywords = re.split(r'[,;•\-]', text)
        return [k.strip() for k in keywords if k.strip() and len(k.strip()) > 2]
    
    def _format_reference(self, text: str) -> str:
        """Format a reference entry."""
        text = text.strip()
        # Add reference number if not present
        if not text.startswith('['):
            return f"• {text}"
        return text
    
    def _format_research_paragraphs(self, lines: list) -> str:
        """Format research content into proper paragraphs."""
        if not lines:
            return ""
        
        result = []
        current_para = []
        
        for line in lines:
            line = line.strip()
            if not line:
                if current_para:
                    result.append(' '.join(current_para))
                    current_para = []
            elif line.startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')):
                if current_para:
                    result.append(' '.join(current_para))
                    current_para = []
                result.append(line)
            elif len(line) < 60 and current_para:
                current_para.append(line)
            else:
                if current_para and len(' '.join(current_para)) > 200:
                    result.append(' '.join(current_para))
                    current_para = []
                current_para.append(line)
        
        if current_para:
            result.append(' '.join(current_para))
        
        return '\n\n'.join(result)
    
    def _get_generic_demo(self, text: str, template: dict) -> dict:
        """Generic demo fallback for unknown templates."""
        lines = text.strip().split('\n')
        title = lines[0][:100] if lines else "Demo Document"
        abstract = text[:200].strip() + "..." if len(text) > 200 else text
        
        template_sections = template.get("sections", [])
        sections = []
        
        remaining_text = text[200:] if len(text) > 200 else text
        words = remaining_text.split()
        chunk_size = max(50, len(words) // max(1, len(template_sections) - 2))
        
        section_idx = 0
        for section_def in template_sections:
            if section_def["name"] in ["Title", "Abstract", "Conclusion", "Authors", "Prepared For", "Keywords", "Meeting Information"]:
                continue
            
            start = section_idx * chunk_size
            end = start + chunk_size
            content = " ".join(words[start:end]) if start < len(words) else "Content will be generated here."
            
            sections.append({
                "heading": section_def["name"],
                "content": content
            })
            section_idx += 1
        
        if not sections:
            sections.append({
                "heading": "Main Content",
                "content": remaining_text[:500] if remaining_text else "Your document content will appear here."
            })
        
        return {
            "title": title,
            "abstract": abstract,
            "sections": sections,
            "conclusion": "Document formatted successfully in demo mode."
        }
    
    async def detect_document_type(self, text: str) -> str:
        """
        Detect the type of document to suggest appropriate template.
        
        Returns one of: research_paper, report, essay, thesis, other
        """
        if settings.DEMO_MODE:
            return "report"
            
        prompt = f"""Analyze this document and determine its type.
Respond with ONLY one of these options: research_paper, report, essay, thesis, other

Document excerpt:
---
{text[:2000]}
---"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0,
                    max_output_tokens=20,
                )
            )
            
            doc_type = response.text.strip().lower()
            valid_types = ["research_paper", "report", "essay", "thesis", "other"]
            
            return doc_type if doc_type in valid_types else "other"
            
        except Exception:
            return "other"
