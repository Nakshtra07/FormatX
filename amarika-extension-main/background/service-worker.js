// Amarika Service Worker - Background Script
// Uses Firebase REST API (no SDK needed - CSP compatible)
// WITH DEBUG LOGGING

// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA2QKzMK-gSoEadGOEhjPOXWO07SScvVm8",
    authDomain: "amarika-extension.firebaseapp.com",
    projectId: "amarika-extension"
};

// Firestore REST API base URL
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

console.log('🚀 Amarika service worker initialized');

chrome.runtime.onInstalled.addListener(() => {
    // Open side panel on action click
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .catch((error) => console.error(error));
    }
});

// ============ DEBUG LOGGING ============
function log(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data) {
        console.log(`[${timestamp}] 📌 ${message}`, data);
    } else {
        console.log(`[${timestamp}] 📌 ${message}`);
    }
}

function logError(message, error) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.error(`[${timestamp}] ❌ ${message}`, error);
}

// ============ STATE ============
let currentUser = null;
let accessToken = null;

// ============ PRESET TEMPLATES ============
const PRESET_TEMPLATES = [
    {
        id: 'ieee',
        name: 'IEEE Academic',
        icon: '📄',
        isPreset: true,
        styles: {
            body: {
                fontFamily: 'Times New Roman',
                fontSize: 10,           // IEEE uses 10pt
                lineSpacing: 100,       // Single spacing
                alignment: 'JUSTIFIED',
                firstLineIndent: 9      // 0.125in ≈ 9pt
            },
            title: {
                fontFamily: 'Times New Roman',
                fontSize: 24,
                bold: true,
                alignment: 'CENTER',
                spaceBelow: 12
            },
            heading1: {
                fontFamily: 'Times New Roman',
                fontSize: 10,
                bold: false,
                smallCaps: true,
                alignment: 'START',
                spaceAbove: 12,
                spaceBelow: 6
            },
            heading2: {
                fontFamily: 'Times New Roman',
                fontSize: 10,
                italic: true,
                alignment: 'START',
                spaceAbove: 10,
                spaceBelow: 5
            }
        },
        layout: {
            margins: {
                top: 54,    // 0.75in × 72
                bottom: 72, // 1.0in × 72
                left: 45,   // 0.625in × 72
                right: 45   // 0.625in × 72
            }
        }
    },
    {
        id: 'corporate',
        name: 'Corporate Professional',
        icon: '💼',
        isPreset: true,
        styles: { fontFamily: 'Times New Roman', fontSize: 11, lineSpacing: 115 }
    },
    {
        id: 'apa',
        name: 'APA Style',
        icon: '📚',
        isPreset: true,
        styles: { fontFamily: 'Times New Roman', fontSize: 12, lineSpacing: 200 }
    },
    {
        id: 'mla',
        name: 'MLA Format',
        icon: '📝',
        isPreset: true,
        styles: { fontFamily: 'Times New Roman', fontSize: 12, lineSpacing: 200 }
    },
    {
        id: 'modern',
        name: 'Modern Clean',
        icon: '✨',
        isPreset: true,
        styles: { fontFamily: 'Arial', fontSize: 11, lineSpacing: 115 }
    }
];

// ============ AUTH FUNCTIONS ============

// Clear cached token (useful when scopes change)
function clearCachedToken() {
    return new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                log('Clearing cached token');
                chrome.identity.removeCachedAuthToken({ token }, () => {
                    accessToken = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

// Get Google OAuth token
function getGoogleToken(interactive = true) {
    return new Promise((resolve, reject) => {
        log(`Getting Google token (interactive: ${interactive})`);

        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError) {
                logError('getAuthToken failed', chrome.runtime.lastError.message);
                reject(new Error(chrome.runtime.lastError.message));
            } else if (!token) {
                logError('No token returned', 'Token is null');
                reject(new Error('No token returned'));
            } else {
                log('Got token successfully', token.substring(0, 20) + '...');
                accessToken = token;
                resolve(token);
            }
        });
    });
}

// Get user info from Google
async function getGoogleUserInfo(token) {
    log('Fetching user info from Google');

    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    });

    log('Userinfo response status', res.status);

    if (!res.ok) {
        const errorText = await res.text();
        logError('Userinfo API failed', errorText);
        throw new Error(`Failed to get user info: ${res.status} - ${errorText}`);
    }

    const userInfo = await res.json();
    log('Got user info', { email: userInfo.email, name: userInfo.name });
    return userInfo;
}

// Sign in with Google
async function signInWithGoogle() {
    log('=== SIGN IN STARTED ===');

    try {
        // Step 1: Clear any old cached tokens
        await clearCachedToken();
        log('Step 1: Cleared old tokens');

        // Step 2: Get new token
        const token = await getGoogleToken(true);
        log('Step 2: Got new token');

        // Step 3: Get user info
        const userInfo = await getGoogleUserInfo(token);
        log('Step 3: Got user info');

        currentUser = {
            uid: userInfo.id,
            email: userInfo.email,
            displayName: userInfo.name,
            photoURL: userInfo.picture
        };

        log('Step 4: Created user object', currentUser);

        // Step 5: Store in chrome.storage
        await chrome.storage.local.set({ user: currentUser });
        log('Step 5: Saved to storage');

        // Step 6: Try to save to Firestore (optional, don't fail if it errors)
        try {
            await createOrUpdateUserProfile(currentUser, token);
            log('Step 6: Saved to Firestore');
        } catch (firestoreError) {
            logError('Firestore save failed (non-critical)', firestoreError.message);
            // Don't fail the sign in if Firestore fails
        }

        log('=== SIGN IN SUCCESS ===');
        return currentUser;

    } catch (error) {
        logError('=== SIGN IN FAILED ===', error.message);
        throw error;
    }
}

// Sign out
async function signOut() {
    log('Signing out');
    await clearCachedToken();
    currentUser = null;
    await chrome.storage.local.remove('user');
    log('Signed out successfully');
    return { success: true };
}

// Get current user
async function getCurrentUser() {
    if (currentUser) {
        log('Returning cached user', currentUser.email);
        return currentUser;
    }

    // Try to restore from storage
    const stored = await chrome.storage.local.get('user');
    if (stored.user) {
        log('Restored user from storage', stored.user.email);
        currentUser = stored.user;

        // Verify token is still valid
        try {
            await getGoogleToken(false);
            return currentUser;
        } catch {
            log('Token expired, clearing user');
            await chrome.storage.local.remove('user');
            currentUser = null;
        }
    }

    log('No current user');
    return null;
}

// ============ FIRESTORE FUNCTIONS ============

// Convert Firestore document to plain object
function firestoreToObject(doc) {
    const result = {};
    if (!doc.fields) return result;

    for (const [key, value] of Object.entries(doc.fields)) {
        if (value.stringValue !== undefined) result[key] = value.stringValue;
        else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
        else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
        else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
        else if (value.timestampValue !== undefined) result[key] = new Date(value.timestampValue);
        else if (value.mapValue !== undefined) result[key] = firestoreToObject(value.mapValue);
        else if (value.nullValue !== undefined) result[key] = null;
    }

    return result;
}

// Convert plain object to Firestore format
function objectToFirestore(obj) {
    const fields = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            fields[key] = { nullValue: null };
        } else if (typeof value === 'string') {
            fields[key] = { stringValue: value };
        } else if (typeof value === 'number') {
            fields[key] = Number.isInteger(value)
                ? { integerValue: value.toString() }
                : { doubleValue: value };
        } else if (typeof value === 'boolean') {
            fields[key] = { booleanValue: value };
        } else if (value instanceof Date) {
            fields[key] = { timestampValue: value.toISOString() };
        } else if (typeof value === 'object') {
            fields[key] = { mapValue: { fields: objectToFirestore(value) } };
        }
    }

    return fields;
}

// Create or update user profile
async function createOrUpdateUserProfile(user, token) {
    log('Creating/updating user profile in Firestore');

    const docPath = `${FIRESTORE_URL}/users/${user.uid}`;
    const now = new Date().toISOString();

    // Try to create new user
    const newUser = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL || '',
        createdAt: now,
        lastLogin: now,
        tier: 'free',
        formatsThisMonth: 0
    };

    const res = await fetch(`${FIRESTORE_URL}/users?documentId=${user.uid}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: objectToFirestore(newUser) })
    });

    log('Firestore create response', res.status);

    if (!res.ok && res.status !== 409) {
        const errorText = await res.text();
        logError('Firestore create failed', errorText);
    }
}

// Get user profile - simplified version
async function getUserProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    // Return basic profile from memory/storage
    // Firestore sync can happen in background
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        subscription: { tier: 'free' },
        usage: { formatsThisMonth: 0 }
    };
}

// ============ TEMPLATE FUNCTIONS ============

function getAllTemplates() {
    return PRESET_TEMPLATES;
}

function getTemplate(templateId) {
    // Check presets first
    const preset = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (preset) return preset;

    // Check user templates from storage
    return null; // Will be loaded async
}

// Get user's custom templates from storage
async function getUserTemplates() {
    const user = await getCurrentUser();
    if (!user) return [];

    const stored = await chrome.storage.local.get('userTemplates');
    return stored.userTemplates || [];
}

// Save a custom template
async function saveTemplate(templateData) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in to save templates');

    log('Saving template', templateData.name);

    const templates = await getUserTemplates();

    // Generate unique ID
    const newTemplate = {
        ...templateData,
        id: `custom_${Date.now()}`,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
    };

    templates.push(newTemplate);
    await chrome.storage.local.set({ userTemplates: templates });

    log('Template saved', newTemplate.id);
    return newTemplate;
}

// Delete a custom template
async function deleteTemplate(templateId) {
    log('Deleting template', templateId);

    const templates = await getUserTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    await chrome.storage.local.set({ userTemplates: filtered });

    return { success: true };
}

// ============ STYLE EXTRACTION ============

async function extractStylesFromDocument(docId) {
    log('Extracting styles from document', docId);

    const token = await getGoogleToken(true);

    const res = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to read document');
    }

    const doc = await res.json();
    log('Document loaded for extraction');

    // Extract styles from document
    const styles = {
        body: { fontFamily: 'Times New Roman', fontSize: 12, lineSpacing: 200 },
        heading1: { fontFamily: 'Arial', fontSize: 24, bold: true },
        heading2: { fontFamily: 'Arial', fontSize: 18, bold: true }
    };

    // Analyze document content to extract actual styles
    const content = doc.body?.content || [];

    let bodyStyles = [];
    let h1Styles = [];
    let h2Styles = [];

    for (const element of content) {
        if (!element.paragraph) continue;

        const para = element.paragraph;
        const namedStyle = para.paragraphStyle?.namedStyleType;

        for (const elem of para.elements || []) {
            const textStyle = elem.textRun?.textStyle;
            if (!textStyle) continue;

            const styleInfo = {
                fontFamily: textStyle.weightedFontFamily?.fontFamily || 'Times New Roman',
                fontSize: textStyle.fontSize?.magnitude || 12,
                bold: textStyle.bold || false
            };

            if (namedStyle === 'HEADING_1') {
                h1Styles.push(styleInfo);
            } else if (namedStyle === 'HEADING_2') {
                h2Styles.push(styleInfo);
            } else if (namedStyle === 'NORMAL_TEXT' || !namedStyle) {
                bodyStyles.push(styleInfo);
            }
        }

        // Extract line spacing from paragraph style
        if (para.paragraphStyle?.lineSpacing) {
            styles.body.lineSpacing = para.paragraphStyle.lineSpacing;
        }
    }

    // Use most common styles found
    if (bodyStyles.length > 0) {
        styles.body.fontFamily = mostCommon(bodyStyles.map(s => s.fontFamily));
        styles.body.fontSize = mostCommon(bodyStyles.map(s => s.fontSize));
    }

    if (h1Styles.length > 0) {
        styles.heading1.fontFamily = mostCommon(h1Styles.map(s => s.fontFamily));
        styles.heading1.fontSize = mostCommon(h1Styles.map(s => s.fontSize));
        styles.heading1.bold = h1Styles.some(s => s.bold);
    }

    if (h2Styles.length > 0) {
        styles.heading2.fontFamily = mostCommon(h2Styles.map(s => s.fontFamily));
        styles.heading2.fontSize = mostCommon(h2Styles.map(s => s.fontSize));
        styles.heading2.bold = h2Styles.some(s => s.bold);
    }

    log('Extracted styles', styles);
    return styles;
}

// Helper: find most common value in array
function mostCommon(arr) {
    if (arr.length === 0) return null;

    const counts = {};
    for (const item of arr) {
        counts[item] = (counts[item] || 0) + 1;
    }

    let maxCount = 0;
    let maxItem = arr[0];
    for (const [item, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            maxItem = item;
        }
    }

    return isNaN(maxItem) ? maxItem : parseFloat(maxItem);
}

// ============ DOCUMENT FORMATTING ============

async function getDocumentLength(docId, token) {
    const res = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to read document');
    }

    const doc = await res.json();
    const content = doc.body?.content || [];
    let endIndex = 1;

    for (const element of content) {
        if (element.endIndex && element.endIndex > endIndex) {
            endIndex = element.endIndex;
        }
    }

    return endIndex - 1;
}

async function formatDocument(docId, templateId) {
    log('Formatting document', { docId, templateId });
    const token = await getGoogleToken(true);

    // 1. Load Template
    let template = await getTemplate(templateId);
    if (!template) {
        // Fallback checks
        if (!template) template = (await getUserTemplates()).find(t => t.id === templateId);
        if (!template) template = PRESET_TEMPLATES.find(t => t.id === templateId);
    }
    if (!template) throw new Error('Template not found');

    // 2. Load Document Structure
    const { doc } = await getDocumentContent(docId, token);
    if (!doc.body || !doc.body.content) throw new Error('Document is empty');

    const content = doc.body.content;
    const bodyStyles = template.styles.body || template.styles;
    const requests = [];

    // 3. Global Styles (Basics)
    let docEndIndex = 1;
    for (const el of content) { if (el.endIndex > docEndIndex) docEndIndex = el.endIndex; }

    requests.push({
        updateTextStyle: {
            range: { startIndex: 1, endIndex: docEndIndex - 1 },
            textStyle: {
                fontSize: { magnitude: bodyStyles.fontSize || 12, unit: 'PT' },
                weightedFontFamily: { fontFamily: bodyStyles.fontFamily || 'Times New Roman' }
            },
            fields: 'fontSize,weightedFontFamily'
        }
    });

    // Apply paragraph styles: lineSpacing, alignment, firstLineIndent
    const paragraphStyleFields = [];
    const paragraphStyle = {};

    if (bodyStyles.lineSpacing) {
        paragraphStyle.lineSpacing = bodyStyles.lineSpacing;
        paragraphStyleFields.push('lineSpacing');
    }
    if (bodyStyles.alignment) {
        paragraphStyle.alignment = bodyStyles.alignment;
        paragraphStyleFields.push('alignment');
    }
    if (bodyStyles.firstLineIndent) {
        paragraphStyle.indentFirstLine = { magnitude: bodyStyles.firstLineIndent, unit: 'PT' };
        paragraphStyleFields.push('indentFirstLine');
    }

    if (paragraphStyleFields.length > 0) {
        requests.push({
            updateParagraphStyle: {
                range: { startIndex: 1, endIndex: docEndIndex - 1 },
                paragraphStyle,
                fields: paragraphStyleFields.join(',')
            }
        });
    }

    // 4. Regex-based Structural Formatting (The "Power" part)
    let titleFormatted = false;  // Track if we've formatted the title
    for (const elem of content) {
        if (!elem.paragraph) continue;

        const paragraph = elem.paragraph;
        const startIndex = elem.startIndex;
        const endIndex = elem.endIndex;

        let text = '';
        for (const el of paragraph.elements) {
            if (el.textRun && el.textRun.content) text += el.textRun.content;
        }
        text = text.trim();
        if (!text) continue;

        // A. TITLE - First substantial paragraph that's not a numbered heading
        // Detect title: long enough, not numbered, appears early in document
        if (!titleFormatted && startIndex < 500 && text.length > 20 && text.length < 150) {
            // Not a numbered heading, not Abstract/Keywords
            if (!/^\d+\./.test(text) && !/^[IVXLCDM]+\./i.test(text) && !/^Abstract/i.test(text) && !/^Keywords/i.test(text)) {
                const titleStyle = template.styles.title || {};
                requests.push({
                    updateParagraphStyle: {
                        range: { startIndex, endIndex: endIndex - 1 },
                        paragraphStyle: {
                            alignment: 'CENTER',
                            spaceBelow: { magnitude: titleStyle.spaceBelow || 12, unit: 'PT' },
                            indentFirstLine: { magnitude: 0, unit: 'PT' }  // No indent for title
                        },
                        fields: 'alignment,spaceBelow,indentFirstLine'
                    }
                });
                requests.push({
                    updateTextStyle: {
                        range: { startIndex, endIndex: endIndex - 1 },
                        textStyle: {
                            bold: true,
                            fontSize: { magnitude: titleStyle.fontSize || 24, unit: 'PT' },
                            weightedFontFamily: { fontFamily: titleStyle.fontFamily || 'Times New Roman' }
                        },
                        fields: 'bold,fontSize,weightedFontFamily'
                    }
                });
                titleFormatted = true;
                continue;  // Skip to next paragraph
            }
        }

        // B. HEADINGS
        // Level 1: "1. Introduction" -> Left, SmallCaps
        if (/^\d+\.\s+[A-Za-z]+/.test(text) || /^[IVXLCDM]+\.\s+[A-Za-z]+/i.test(text)) {
            if (text.length < 100) {
                const h1 = template.styles.heading1 || {};
                requests.push({
                    updateParagraphStyle: {
                        range: { startIndex, endIndex: endIndex - 1 },
                        paragraphStyle: {
                            alignment: h1.alignment?.toUpperCase() === 'CENTER' ? 'CENTER' : 'START',
                            spaceAbove: { magnitude: h1.spaceAbove || 12, unit: 'PT' },
                            spaceBelow: { magnitude: h1.spaceBelow || 6, unit: 'PT' },
                            indentFirstLine: { magnitude: 0, unit: 'PT' }  // No indent for headings
                        },
                        fields: 'alignment,spaceAbove,spaceBelow,indentFirstLine'
                    }
                });
                requests.push({
                    updateTextStyle: {
                        range: { startIndex, endIndex: endIndex - 1 },
                        textStyle: {
                            bold: h1.bold !== false ? h1.bold : false,
                            smallCaps: h1.smallCaps !== undefined ? h1.smallCaps : true,
                            fontSize: { magnitude: h1.fontSize || 10, unit: 'PT' }
                        },
                        fields: 'bold,smallCaps,fontSize'
                    }
                });
            }
        }

        // Level 2: "2.1 Methodology" -> Left, Italic
        else if (/^\d+\.\d+\s+/.test(text) || /^[A-Z]\.\s+/.test(text)) {
            if (text.length < 100) {
                const h2 = template.styles.heading2 || {};
                requests.push({
                    updateParagraphStyle: {
                        range: { startIndex, endIndex: endIndex - 1 },
                        paragraphStyle: {
                            alignment: 'START',
                            spaceAbove: { magnitude: h2.spaceAbove || 10, unit: 'PT' },
                            indentFirstLine: { magnitude: 0, unit: 'PT' }  // No indent for headings
                        },
                        fields: 'alignment,spaceAbove,indentFirstLine'
                    }
                });
                requests.push({
                    updateTextStyle: {
                        range: { startIndex, endIndex: endIndex - 1 },
                        textStyle: {
                            italic: true,
                            fontSize: { magnitude: h2.fontSize || 10, unit: 'PT' }
                        },
                        fields: 'italic,fontSize'
                    }
                });
            }
        }

        // C. ABSTRACT & KEYWORDS
        else if (/^Abstract/i.test(text) || /^Keywords/i.test(text)) {
            requests.push({
                updateTextStyle: {
                    range: { startIndex, endIndex: endIndex - 1 },
                    textStyle: { bold: true, fontSize: { magnitude: 9, unit: 'PT' } },
                    fields: 'bold,fontSize'
                }
            });
        }
    }

    // 5. Apply Margins
    if (template.layout && template.layout.margins) {
        const margins = template.layout.margins;
        const toPt = (val) => {
            if (typeof val === 'number') return val;
            if (String(val).includes('in')) return parseFloat(val) * 72;
            return parseFloat(val);
        };
        requests.push({
            updateDocumentStyle: {
                documentStyle: {
                    marginTop: { magnitude: toPt(margins.top), unit: 'PT' },
                    marginBottom: { magnitude: toPt(margins.bottom), unit: 'PT' },
                    marginLeft: { magnitude: toPt(margins.left), unit: 'PT' },
                    marginRight: { magnitude: toPt(margins.right), unit: 'PT' }
                },
                fields: 'marginTop,marginBottom,marginLeft,marginRight'
            }
        });
    }

    // 6. Execute Batch Update
    if (requests.length > 0) {
        const res = await fetch(
            `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests })
            }
        );

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            const errorMsg = error.error?.message || 'Formatting failed';

            // Provide user-friendly error messages for common issues
            if (errorMsg.includes('not supported for this document')) {
                throw new Error('Cannot format this document. It may be a Word/PDF file - please convert it to Google Docs format first (File → Save as Google Docs), or you may only have view access.');
            }
            if (errorMsg.includes('permission') || errorMsg.includes('403')) {
                throw new Error('You don\'t have edit permission for this document. Please request access from the owner.');
            }

            throw new Error(errorMsg);
        }
    }

    log('Power Formatting complete');
    return { success: true };
}

// Razorpay Configuration - TEST MODE
const RAZORPAY_CONFIG = {
    keyId: 'rzp_test_S8HiwAEAf9UPdp',
    // Cloud function URL for creating subscriptions
    subscriptionEndpoint: 'https://createsubscription-ulft6w3rqa-el.a.run.app'
};

// Pricing Plans (Test Mode - Pro only)
const PRICING = {
    pro_monthly: { planId: 'plan_S8HkUbeANDtrsP', tier: 'pro' },
    pro_annual: { planId: 'plan_S8Hm0hBBAVpqxw', tier: 'pro' }
};

// Feature limits by tier
const TIER_LIMITS = {
    free: {
        customTemplates: 1,
        importFromDoc: false,
        aiFormatting: false
    },
    pro: {
        customTemplates: 10,
        importFromDoc: true,
        aiFormatting: true
    },
    business: {
        customTemplates: Infinity,
        importFromDoc: true,
        aiFormatting: true
    }
};

// ============ SUBSCRIPTION FUNCTIONS ============

// Get user's current subscription tier
async function getUserTier() {
    const user = await getCurrentUser();
    if (!user) return 'free';

    const stored = await chrome.storage.local.get('subscription');
    return stored.subscription?.tier || 'free';
}

// Check feature access
async function checkFeatureAccess(feature) {
    const tier = await getUserTier();
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    return !!limits[feature];
}

// Check template limit
async function checkTemplateLimit() {
    const tier = await getUserTier();
    const limit = TIER_LIMITS[tier]?.customTemplates || 1;
    const templates = await getUserTemplates();
    return {
        canCreate: templates.length < limit,
        current: templates.length,
        limit: limit === Infinity ? '∞' : limit
    };
}

// Create Razorpay Subscription (returns local checkout page URL)
async function createCheckoutSession(planId, tier) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in first');

    log('Creating Razorpay subscription', { planId, tier });

    try {
        const response = await fetch(RAZORPAY_CONFIG.subscriptionEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planId,
                userId: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0]
            })
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create subscription');

            log('Subscription created', { subscriptionId: data.subscriptionId });

            // Determine plan name and amount from tier
            const planDetails = {
                pro: { name: 'Pro Monthly', amount: 299 },
                pro_annual: { name: 'Pro Annual', amount: 2499 }
            };
            const planKey = planId.includes('Hm0') ? 'pro_annual' : 'pro';  // Check if annual plan
            const plan = planDetails[planKey] || planDetails.pro;

            // Build local checkout page URL with parameters
            const checkoutUrl = chrome.runtime.getURL('popup/checkout.html') +
                `?subscription_id=${encodeURIComponent(data.subscriptionId)}` +
                `&tier=${encodeURIComponent(tier)}` +
                `&plan=${encodeURIComponent(plan.name)}` +
                `&amount=${plan.amount}` +
                `&email=${encodeURIComponent(user.email)}` +
                `&name=${encodeURIComponent(user.displayName || '')}`;

            return {
                url: checkoutUrl,
                subscriptionId: data.subscriptionId
            };
        } else {
            const text = await response.text();
            logError('Invalid response from server', text.substring(0, 200));
            throw new Error(`Server Error (${response.status}): ${response.status === 404 ? 'Function URL not found' : 'Check console logs'}`);
        }
    } catch (error) {
        logError('Checkout creation failed', error);
        throw error;
    }
}

// Update subscription (called after payment or manual override for testing)
async function updateSubscription(tier, validUntil = null) {
    const subscription = {
        tier,
        validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ subscription });
    log('Subscription updated', subscription);

    return subscription;
}

// Get subscription status
async function getSubscriptionStatus() {
    const tier = await getUserTier();
    const stored = await chrome.storage.local.get('subscription');
    const templateCheck = await checkTemplateLimit();

    return {
        tier,
        validUntil: stored.subscription?.validUntil,
        features: TIER_LIMITS[tier],
        templates: templateCheck
    };
}

// ============ AI / GEMINI FUNCTIONS ============

// Gemini API Configuration - Using Gemini 3 Flash Preview
// Gemini API Configuration - Using Gemini 1.5 Flash (Stable)
const GEMINI_CONFIG = {
    model: 'gemini-1.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
};

// Get Gemini API key from storage
async function getGeminiApiKey() {
    const stored = await chrome.storage.local.get('geminiApiKey');
    return stored.geminiApiKey;
}

// Call Gemini API
async function callGemini(prompt) {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) throw new Error('Gemini API key not configured');

    const url = `${GEMINI_CONFIG.endpoint}/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
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

    throw new Error('Invalid AI response');
}

// Get document content for AI analysis
async function getDocumentContent(docId) {
    const token = await getGoogleToken(true);

    const res = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error('Failed to read document');

    const doc = await res.json();
    let text = '';

    for (const element of doc.body?.content || []) {
        if (element.paragraph) {
            for (const elem of element.paragraph.elements || []) {
                if (elem.textRun?.content) {
                    text += elem.textRun.content;
                }
            }
        }
    }

    return { text, doc };
}

// AI: Analyze document and detect type
async function aiAnalyzeDocument(docId) {
    log('AI analyzing document', docId);

    const { text } = await getDocumentContent(docId);

    const prompt = `
Analyze this document content and determine its type and appropriate formatting style.

DOCUMENT CONTENT:
"""
${text.substring(0, 3000)}
"""

Respond in JSON format ONLY:
{
  "documentType": "academic_paper|business_report|creative_writing|technical_doc|letter|resume|other",
  "confidence": 0.0-1.0,
  "suggestedTemplate": "ieee|apa|mla|corporate|modern",
  "reasoning": "brief explanation",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    return await callGemini(prompt);
}

// AI: Parse natural language command
async function aiParseCommand(command) {
    log('AI parsing command', command);

    const prompt = `
You are a document formatting assistant. Parse the user's formatting command.

USER COMMAND: "${command}"

IMPORTANT: Only use these SUPPORTED action types:
- font: Change font family (e.g., "Arial", "Times New Roman", "Georgia")
- fontSize: Change font size in points (e.g., 12, 14, 16, 18)
- lineSpacing: Set line spacing percentage (100=single, 150=1.5, 200=double)
- bold: Make text bold (true/false)
- italic: Make text italic (true/false)
- alignment: Text alignment ("left", "center", "right", "justify")

DO NOT use unsupported actions like: textTransform, uppercase, color, underline, margins.

If the user asks for something unsupported, set understood to false and explain in clarificationNeeded.

Respond in JSON format ONLY:
{
  "understood": true,
  "actions": [
    {
      "type": "font|fontSize|lineSpacing|bold|italic|alignment",
      "target": "all",
      "value": "the value"
    }
  ],
  "confirmation": "I will [describe what will happen]",
  "clarificationNeeded": null
}

Examples:
- "Make it double spaced" → {"type": "lineSpacing", "target": "all", "value": "200"}
- "Change font to Arial" → {"type": "font", "target": "all", "value": "Arial"}
- "Make text bold" → {"type": "bold", "target": "all", "value": "true"}
- "Set font size to 14" → {"type": "fontSize", "target": "all", "value": "14"}`;

    return await callGemini(prompt);
}

// AI: Get style suggestions
async function aiGetSuggestions(docId, templateRules = null) {
    log('AI getting suggestions', docId);

    const { text } = await getDocumentContent(docId);

    const prompt = `
Analyze this document and suggest formatting improvements.
${templateRules ? `
STRICT TEMPLATE RULES (Must Follow):
"${templateRules}"
` : ''}

DOCUMENT CONTENT (first 2000 chars):
"""
${text.substring(0, 2000)}
"""

Provide specific, actionable formatting suggestions in JSON:
{
  "overallAssessment": "brief assessment of current formatting",
  "suggestions": [
    {
      "priority": "high|medium|low",
      "category": "readability|consistency|professionalism${templateRules ? '|compliance' : ''}",
      "issue": "what the problem is",
      "recommendation": "what to do"
    }
  ],
  "quickFixes": [
    {
      "name": "Fix name",
      "description": "What it does",
      "actions": [{"type": "lineSpacing", "target": "all", "value": "200"}]
    }
  ]
}`;

    return await callGemini(prompt);
}

// AI: Check consistency
async function aiCheckConsistency(docId, templateRules = null) {
    log('AI checking consistency', docId);

    const { text, doc } = await getDocumentContent(docId);

    const prompt = `
Analyze this document for formatting inconsistencies${templateRules ? ' and template compliance' : ''}.

${templateRules ? `
TEMPLATE RULES TO ENFORCE:
"${templateRules}"
` : ''}

DOCUMENT TEXT (first 2000 chars):
"""
${text.substring(0, 2000)}
"""

Find inconsistencies and respond in JSON:
{
  "hasIssues": true|false,
  "issueCount": number,
  "issues": [
    {
      "type": "mixed_fonts|inconsistent_sizes|irregular_spacing${templateRules ? '|template_violation' : ''}",
      "description": "Description of the issue",
      "fix": "how to fix it",
      "actions": [{"type": "font|fontSize|lineSpacing|bold|italic|alignment", "target": "all|headings|body", "value": "value"}]
    }
  ],
  "overallScore": 0-100,
  "summary": "Brief summary"
}`;

    return await callGemini(prompt);
}

// AI: Apply formatting actions from AI
async function aiApplyActions(docId, actions) {
    log('AI applying actions', actions);

    const token = await getGoogleToken(true);
    const docLength = await getDocumentLength(docId, token);

    const requests = [];

    for (const action of actions) {
        const range = { startIndex: 1, endIndex: docLength };

        switch (action.type) {
            case 'font':
                requests.push({
                    updateTextStyle: {
                        range,
                        textStyle: { weightedFontFamily: { fontFamily: action.value } },
                        fields: 'weightedFontFamily'
                    }
                });
                break;
            case 'fontSize':
                requests.push({
                    updateTextStyle: {
                        range,
                        textStyle: { fontSize: { magnitude: parseFloat(action.value), unit: 'PT' } },
                        fields: 'fontSize'
                    }
                });
                break;
            case 'lineSpacing':
                requests.push({
                    updateParagraphStyle: {
                        range,
                        paragraphStyle: { lineSpacing: parseFloat(action.value) },
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
                const alignMap = { left: 'START', center: 'CENTER', right: 'END', justify: 'JUSTIFIED' };
                requests.push({
                    updateParagraphStyle: {
                        range,
                        paragraphStyle: { alignment: alignMap[action.value?.toLowerCase()] || 'START' },
                        fields: 'alignment'
                    }
                });
                break;
        }
    }

    if (requests.length === 0) {
        return { success: true, message: 'No actions to apply' };
    }

    const res = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
        }
    );

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to apply AI changes');
    }

    return { success: true };
}

// ============ MESSAGE HANDLER ============

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    log('Message received', msg.action);

    const handlers = {
        // Auth
        SIGN_IN: signInWithGoogle,
        SIGN_OUT: signOut,
        GET_USER: getCurrentUser,
        GET_PROFILE: getUserProfile,

        // Templates
        GET_TEMPLATES: () => Promise.resolve(getAllTemplates()),
        GET_USER_TEMPLATES: getUserTemplates,
        SAVE_TEMPLATE: async () => {
            const check = await checkTemplateLimit();
            if (!check.canCreate) {
                throw new Error(`Template limit reached (${check.limit}). Upgrade to create more.`);
            }
            return saveTemplate(msg.template);
        },
        DELETE_TEMPLATE: () => deleteTemplate(msg.templateId),
        EXTRACT_STYLES: async () => {
            const hasAccess = await checkFeatureAccess('importFromDoc');
            if (!hasAccess) {
                throw new Error('Import from Doc is a Pro feature. Please upgrade.');
            }
            return extractStylesFromDocument(msg.docId);
        },
        FORMAT_DOC: () => formatDocument(msg.docId, msg.templateId),

        // Subscription
        GET_TIER: getUserTier,
        GET_SUBSCRIPTION: getSubscriptionStatus,
        CHECK_FEATURE: () => checkFeatureAccess(msg.feature),
        CHECK_TEMPLATE_LIMIT: checkTemplateLimit,
        CREATE_CHECKOUT: () => createCheckoutSession(msg.planId, msg.tier),
        UPDATE_SUBSCRIPTION: () => updateSubscription(msg.tier, msg.validUntil),

        // AI Features
        AI_ANALYZE: async () => {
            const hasAccess = await checkFeatureAccess('aiFormatting');
            if (!hasAccess) throw new Error('AI features require Pro. Please upgrade.');
            return aiAnalyzeDocument(msg.docId);
        },
        AI_COMMAND: async () => {
            const hasAccess = await checkFeatureAccess('aiFormatting');
            if (!hasAccess) throw new Error('AI features require Pro. Please upgrade.');
            return aiParseCommand(msg.command);
        },
        AI_SUGGEST: async () => {
            const hasAccess = await checkFeatureAccess('aiFormatting');
            if (!hasAccess) throw new Error('AI features require Pro. Please upgrade.');
            return aiGetSuggestions(msg.docId, msg.templateRules);
        },
        AI_CHECK_CONSISTENCY: async () => {
            const hasAccess = await checkFeatureAccess('aiFormatting');
            if (!hasAccess) throw new Error('AI features require Pro. Please upgrade.');
            return aiCheckConsistency(msg.docId, msg.templateRules);
        },
        AI_APPLY_ACTIONS: () => aiApplyActions(msg.docId, msg.actions)
    };

    const handler = handlers[msg.action];
    if (!handler) {
        log('Unknown action', msg.action);
        return false;
    }

    handler()
        .then(result => {
            log('Handler success', msg.action);
            sendResponse({ success: true, data: result });
        })
        .catch(error => {
            logError('Handler failed', { action: msg.action, error: error.message });
            sendResponse({ success: false, error: error.message });
        });

    return true;
});

log('Service worker ready - AI features enabled');

