// Amarika AI Engine - Gemini Integration
// Provides smart formatting assistance using Google's Gemini API

// Gemini API Configuration
const GEMINI_CONFIG = {
    apiKey: 'YOUR_GEMINI_API_KEY', // Get from https://makersuite.google.com/app/apikey
    model: 'gemini-2.0-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
};

// ============ PROMPTS ============

const PROMPTS = {
    // Analyze document and detect type
    detectDocumentType: (content) => `
Analyze this document content and determine its type and appropriate formatting style.

DOCUMENT CONTENT:
"""
${content.substring(0, 3000)}
"""

Respond in JSON format ONLY:
{
  "documentType": "academic_paper|business_report|creative_writing|technical_doc|letter|resume|other",
  "confidence": 0.0-1.0,
  "suggestedTemplate": "ieee|apa|mla|corporate|modern|minimal",
  "reasoning": "brief explanation",
  "detectedElements": {
    "hasAbstract": boolean,
    "hasHeadings": boolean,
    "hasCitations": boolean,
    "hasCodeBlocks": boolean,
    "hasTables": boolean
  },
  "suggestions": ["suggestion 1", "suggestion 2"]
}
`,

    // Parse natural language formatting command
    parseFormattingCommand: (command) => `
Parse this formatting command and extract the formatting parameters.

USER COMMAND: "${command}"

Extract formatting instructions and respond in JSON format ONLY:
{
  "understood": true/false,
  "actions": [
    {
      "type": "font|fontSize|lineSpacing|alignment|heading|bold|italic|color",
      "target": "all|body|headings|h1|h2|h3|selection",
      "value": "the value to apply"
    }
  ],
  "confirmation": "Human readable summary of what will be done",
  "clarificationNeeded": null or "question if command is unclear"
}

Examples:
- "Make it double spaced" → lineSpacing: 200, target: all
- "Change font to Arial" → font: Arial, target: all
- "Make headings 18pt bold" → fontSize: 18, bold: true, target: headings
- "Set body to Times New Roman 12pt" → font: Times New Roman, fontSize: 12, target: body
`,

    // Generate style suggestions based on content and optional template rules
    suggestStyles: (content, currentStyles, templateRules = null) => `
Analyze this document and suggest formatting improvements.
${templateRules ? `
STRICT TEMPLATE RULES (Must Follow):
"${templateRules}"
` : ''}

DOCUMENT CONTENT (first 2000 chars):
"""
${content.substring(0, 2000)}
"""

CURRENT STYLES:
${JSON.stringify(currentStyles, null, 2)}

Provide specific, actionable formatting suggestions in JSON:
{
  "overallAssessment": "brief assessment of current formatting",
  "suggestions": [
    {
      "priority": "high|medium|low",
      "category": "readability|consistency|professionalism|accessibility${templateRules ? '|compliance' : ''}",
      "issue": "what the problem is",
      "recommendation": "what to do",
      "action": {
        "type": "font|fontSize|lineSpacing|margins|headings",
        "value": "specific value"
      }
    }
  ],
  "quickFixes": [
    {
      "name": "Fix name",
      "description": "What it does",
      "actions": [array of formatting actions]
    }
  ]
}
`,

    // Check for consistency issues
    checkConsistency: (documentStructure, templateRules = null) => `
Analyze this document structure for formatting inconsistencies${templateRules ? ' and template compliance' : ''}.

${templateRules ? `
TEMPLATE RULES TO ENFORCE:
"${templateRules}"
` : ''}

DOCUMENT STRUCTURE:
${JSON.stringify(documentStructure, null, 2)}

Find inconsistencies and respond in JSON:
{
  "hasIssues": boolean,
  "issueCount": number,
  "issues": [
    {
      "type": "mixed_fonts|inconsistent_sizes|irregular_spacing|heading_hierarchy${templateRules ? '|template_violation' : ''}",
      "description": "Description of the issue",
      "location": "where in document",
      "fix": "how to fix it",
      "actions": [
        {
          "type": "font|fontSize|lineSpacing|bold|italic|alignment",
          "target": "all|headings|body|selection",
          "value": "the value to apply"
        }
      ]
    }
  ],
  "overallScore": 0-100,
  "summary": "Brief summary"
}
`
};

// ============ GEMINI API ============

async function callGemini(prompt) {
    const url = `${GEMINI_CONFIG.endpoint}/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.2, // Low temperature for consistent JSON output
                topP: 0.8,
                maxOutputTokens: 2048
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Invalid response from AI');
}

// ============ AI FUNCTIONS ============

/**
 * Analyze document and detect its type/suggest template
 */
async function analyzeDocument(docContent) {
    const prompt = PROMPTS.detectDocumentType(docContent);
    const result = await callGemini(prompt);
    return result;
}

/**
 * Parse a natural language formatting command
 */
async function parseCommand(command) {
    const prompt = PROMPTS.parseFormattingCommand(command);
    const result = await callGemini(prompt);
    return result;
}

/**
 * Get AI-powered style suggestions
 */
async function getSuggestions(docContent, currentStyles, templateRules = null) {
    const prompt = PROMPTS.suggestStyles(docContent, currentStyles, templateRules);
    const result = await callGemini(prompt);
    return result;
}

/**
 * Check document for consistency issues
 */
async function checkConsistency(documentStructure, templateRules = null) {
    const prompt = PROMPTS.checkConsistency(documentStructure, templateRules);
    const result = await callGemini(prompt);
    return result;
}

/**
 * Execute formatting actions from AI
 */
function convertAIActionsToRequests(actions, docLength) {
    const requests = [];

    for (const action of actions) {
        const range = { startIndex: 1, endIndex: docLength };

        switch (action.type) {
            case 'font':
                requests.push({
                    updateTextStyle: {
                        range,
                        textStyle: {
                            weightedFontFamily: { fontFamily: action.value }
                        },
                        fields: 'weightedFontFamily'
                    }
                });
                break;

            case 'fontSize':
                requests.push({
                    updateTextStyle: {
                        range,
                        textStyle: {
                            fontSize: { magnitude: parseFloat(action.value), unit: 'PT' }
                        },
                        fields: 'fontSize'
                    }
                });
                break;

            case 'lineSpacing':
                requests.push({
                    updateParagraphStyle: {
                        range,
                        paragraphStyle: {
                            lineSpacing: parseFloat(action.value)
                        },
                        fields: 'lineSpacing'
                    }
                });
                break;

            case 'bold':
                requests.push({
                    updateTextStyle: {
                        range,
                        textStyle: { bold: action.value === true || action.value === 'true' },
                        fields: 'bold'
                    }
                });
                break;

            case 'italic':
                requests.push({
                    updateTextStyle: {
                        range,
                        textStyle: { italic: action.value === true || action.value === 'true' },
                        fields: 'italic'
                    }
                });
                break;

            case 'alignment':
                const alignmentMap = {
                    'left': 'START',
                    'center': 'CENTER',
                    'right': 'END',
                    'justify': 'JUSTIFIED'
                };
                requests.push({
                    updateParagraphStyle: {
                        range,
                        paragraphStyle: {
                            alignment: alignmentMap[action.value.toLowerCase()] || 'START'
                        },
                        fields: 'alignment'
                    }
                });
                break;
        }
    }

    return requests;
}

// Export for use in service worker
if (typeof module !== 'undefined') {
    module.exports = {
        analyzeDocument,
        parseCommand,
        getSuggestions,
        checkConsistency,
        convertAIActionsToRequests,
        GEMINI_CONFIG
    };
}
