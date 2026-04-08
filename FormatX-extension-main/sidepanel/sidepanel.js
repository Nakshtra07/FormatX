// FormatX Unified Side Panel Logic
// Handles tabs, auth, template management, formatting, and AI

/* ============ STATE & CONFIG ============ */
const STATE = {
    currentUser: null,
    currentProfile: null,
    currentDocId: null,
    currentTier: 'free',
    templates: [],
    extractedStyles: null,
    activeTab: 'home'
};

const PRESET_TEMPLATES = [
    { id: 'ieee', name: 'IEEE Academic', icon: 'IEEE', styles: { body: { fontFamily: 'Times New Roman', fontSize: 12 } } },
    { id: 'corporate', name: 'Corporate Pro', icon: 'PRO', styles: { body: { fontFamily: 'Arial', fontSize: 11 } } },
    { id: 'creative', name: 'Creative', icon: 'ART', styles: { body: { fontFamily: 'Georgia', fontSize: 12 } } }
];

/* ============ DOM ELEMENTS ============ */
const DOM = {
    // Layout
    tabs: document.querySelectorAll('.tab-btn'),
    views: document.querySelectorAll('.view'),

    // Auth & Header
    userProfile: document.getElementById('userProfile'),
    authButtons: document.getElementById('authButtons'),
    signInBtn: document.getElementById('signInBtn'),
    signOutBtn: document.getElementById('signOutBtn'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userTier: document.getElementById('userTier'),

    // Home View
    docStatus: document.getElementById('docStatus'),
    docStatusTitle: document.getElementById('docStatusTitle'),
    docStatusUrl: document.getElementById('docStatusUrl'),
    templateSelect: document.getElementById('templateSelect'),
    formatBtn: document.getElementById('formatBtn'),
    templateInfo: document.getElementById('templateInfo'),
    upgradeBanner: document.getElementById('upgradeBanner'),
    upgradeBtn: document.getElementById('upgradeBtn'),

    // Templates View
    templatesList: document.getElementById('templatesList'),
    createBtn: document.getElementById('createBtn'),
    importBtn: document.getElementById('importBtn'),

    // Create Modal
    createSection: document.getElementById('createSection'),
    cancelCreateBtn: document.getElementById('cancelCreateBtn'),
    saveTemplateBtn: document.getElementById('saveTemplateBtn'),
    // Inputs
    templateName: document.getElementById('templateName'),
    bodyFont: document.getElementById('bodyFont'),
    bodySize: document.getElementById('bodySize'),
    h1Font: document.getElementById('h1Font'),
    h1Size: document.getElementById('h1Size'),
    preview: document.getElementById('preview'),

    // Import Modal
    importSection: document.getElementById('importSection'),
    cancelImportBtn: document.getElementById('cancelImportBtn'),
    extractBtn: document.getElementById('extractBtn'),
    extractedInfo: document.getElementById('extractedInfo'),
    importedName: document.getElementById('importedName'),
    saveImportedBtn: document.getElementById('saveImportedBtn'),
    saveImportedFooter: document.getElementById('saveImportedFooter'),

    // AI View
    apiKeyWarning: document.getElementById('apiKeyWarning'),
    configureKeyBtn: document.getElementById('configureKeyBtn'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    fixBtn: document.getElementById('fixBtn'),
    suggestBtn: document.getElementById('suggestBtn'),
    commandInput: document.getElementById('commandInput'),
    sendCommandBtn: document.getElementById('sendCommandBtn'),
    resultsPanel: document.getElementById('resultsPanel'),
    resultsContent: document.getElementById('resultsContent'),
    closeResultsBtn: document.getElementById('closeResultsBtn'),
    applyResultBtn: document.getElementById('applyResultBtn'),

    // Modals & Toast
    apiKeyModal: document.getElementById('apiKeyModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    cancelKeyBtn: document.getElementById('cancelKeyBtn'),
    toast: document.getElementById('toast')
};

/* ============ INITIALIZATION ============ */
async function init() {
    setupTabs();
    setupEventListeners();
    populateFontSelects();
    setupStorageListener(); // Listen for subscription updates from checkout

    // Auth & Data Load
    await checkAuth();

    // Start polling for document context
    setInterval(detectDocument, 2000);
    detectDocument();
}

/* ============ STORAGE LISTENER (for payment sync) ============ */
function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.subscription) {
            console.log('Subscription changed, refreshing UI...');
            refreshSubscriptionUI();
        }
    });
}

async function refreshSubscriptionUI() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_SUBSCRIPTION' });
        if (response.success && response.data) {
            STATE.currentTier = response.data.tier || 'free';

            // Update Tier Badge
            DOM.userTier.textContent = STATE.currentTier === 'pro' || STATE.currentTier === 'business' ? 'PRO' : 'FREE';
            DOM.userTier.className = `tier-badge ${STATE.currentTier}`;

            // Hide/Show Upgrade Banner
            if (STATE.currentTier !== 'free') {
                DOM.upgradeBanner.classList.add('hidden');
            } else {
                DOM.upgradeBanner.classList.remove('hidden');
            }

            showToast('Subscription updated!');
        }
    } catch (e) {
        console.error('Failed to refresh subscription:', e);
    }
}

/* ============ TABS & NAVIGATION ============ */
function setupTabs() {
    DOM.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update Tab UI
            DOM.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Switch View
            const target = tab.dataset.tab;
            DOM.views.forEach(view => {
                view.classList.remove('active');
                if (view.id === `view-${target}`) view.classList.add('active');
            });

            STATE.activeTab = target;
        });
    });
}

function showModal(modal) {
    modal.classList.remove('hidden');
}

function hideModal(modal) {
    modal.classList.add('hidden');
}

function showToast(msg) {
    DOM.toast.textContent = msg;
    DOM.toast.classList.add('show');
    setTimeout(() => DOM.toast.classList.remove('show'), 3000);
}

/* ============ AUTHENTICATION ============ */
async function checkAuth() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_USER' });
        if (response.success && response.data) {
            STATE.currentUser = response.data;

            // Get profile and subscription
            const profileRes = await chrome.runtime.sendMessage({ action: 'GET_PROFILE' });
            if (profileRes.success) {
                STATE.currentProfile = profileRes.data;
                STATE.currentTier = STATE.currentProfile.subscription?.tier || 'free';
                updateUserUI();
            }

            // Load templates
            await loadTemplates();
            await checkApiKey();
        } else {
            // Show login UI
            DOM.userProfile.classList.add('hidden');
            DOM.signOutBtn.classList.add('hidden');
            DOM.authButtons.classList.remove('hidden');
        }
    } catch (e) {
        console.error('Auth error:', e);
    }
}

function updateUserUI() {
    DOM.authButtons.classList.add('hidden');
    DOM.userProfile.classList.remove('hidden');
    DOM.signOutBtn.classList.remove('hidden');

    // Avatar & Name
    DOM.userAvatar.src = STATE.currentProfile.photoURL || '../icons/logo.png';
    DOM.userName.textContent = STATE.currentProfile.displayName || 'User';

    // Tier Badge
    DOM.userTier.textContent = STATE.currentTier === 'pro' ? 'PRO' : 'FREE';
    DOM.userTier.className = `tier-badge ${STATE.currentTier}`;

    // Upgrade Banner
    if (STATE.currentTier === 'free') {
        DOM.upgradeBanner.classList.remove('hidden');
    } else {
        DOM.upgradeBanner.classList.add('hidden');
    }
}

async function signIn() {
    DOM.signInBtn.textContent = 'Signing in...';
    try {
        const res = await chrome.runtime.sendMessage({ action: 'SIGN_IN' });
        if (res.success) {
            await checkAuth();
            showToast('Signed in successfully');
        }
    } catch (e) {
        showToast('Sign in failed');
    } finally {
        DOM.signInBtn.textContent = 'Sign in with Google';
    }
}

async function signOut() {
    await chrome.runtime.sendMessage({ action: 'SIGN_OUT' });
    window.location.reload();
}

/* ============ DOCUMENT DETECTION ============ */
async function detectDocument() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url && tab.url.includes('docs.google.com/document/d/')) {
            const match = tab.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            STATE.currentDocId = match ? match[1] : null;

            if (STATE.currentDocId) {
                DOM.docStatus.classList.add('active');
                DOM.docStatusTitle.textContent = tab.title.split(' - ')[0] || 'Untitled Document';
                DOM.docStatusUrl.textContent = 'Ready to format';
                DOM.formatBtn.disabled = false;
                return;
            }
        }

        // No doc
        DOM.docStatus.classList.remove('active');
        DOM.docStatusTitle.textContent = 'No Document Found';
        DOM.docStatusUrl.textContent = 'Open a Google Doc to start';
        DOM.formatBtn.disabled = true;
    } catch (e) {
        console.error(e);
    }
}

/* ============ TEMPLATES & FORMATTING ============ */
async function loadTemplates() {
    // Load user templates
    const res = await chrome.runtime.sendMessage({ action: 'GET_USER_TEMPLATES' });
    const userTemplates = res.success ? res.data : [];

    STATE.templates = [...userTemplates, ...PRESET_TEMPLATES];

    // Render Dropdown (Home)
    DOM.templateSelect.innerHTML = STATE.templates.map(t =>
        `<option value="${t.id}">${t.name}</option>`
    ).join('');

    // Render Grid (Templates Tab)
    DOM.templatesList.innerHTML = STATE.templates.map(t => `
        <div class="template-item" data-id="${t.id}">
            <div class="template-icon">${t.icon || 'DOC'}</div>
            <div class="template-name">${t.name}</div>
            ${t.id.length > 10 ? `<button class="delete-btn" data-id="${t.id}">×</button>` : ''}
        </div>
    `).join('');

    // Bind Delete Buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Delete template?')) {
                await chrome.runtime.sendMessage({ action: 'DELETE_TEMPLATE', templateId: btn.dataset.id });
                loadTemplates(); // Reload
            }
        });
    });
}

async function formatDocument() {
    if (!STATE.currentDocId) return;

    DOM.formatBtn.textContent = 'Formatting...';
    DOM.formatBtn.disabled = true;

    const templateId = DOM.templateSelect.value;

    try {
        const res = await chrome.runtime.sendMessage({
            action: 'FORMAT_DOC',
            docId: STATE.currentDocId,
            templateId: templateId
        });

        if (res.success) showToast('Document Formatted!');
        else showToast(res.error || 'Formatting failed');

    } catch (e) {
        showToast('Error formatting document');
    } finally {
        DOM.formatBtn.textContent = 'Format Document';
        DOM.formatBtn.disabled = false;
    }
}

/* ============ TEMPLATE CREATION ============ */
function populateFontSelects() {
    const fonts = ['Arial', 'Times New Roman', 'Georgia', 'Roboto', 'Verdana'];
    const options = fonts.map(f => `<option value="${f}">${f}</option>`).join('');

    DOM.bodyFont.innerHTML = options;
    DOM.h1Font.innerHTML = options;
}

function updatePreview() {
    const h1 = DOM.preview.querySelector('.preview-h1');
    const body = DOM.preview.querySelector('.preview-body');

    h1.style.fontFamily = DOM.h1Font.value;
    h1.style.fontSize = DOM.h1Size.value + 'px';

    body.style.fontFamily = DOM.bodyFont.value;
    body.style.fontSize = DOM.bodySize.value + 'px';
}

async function saveCreatedTemplate() {
    const name = DOM.templateName.value.trim() || 'Untitled';
    const template = {
        name,
        icon: 'NEW',
        isPreset: false,
        styles: {
            body: { fontFamily: DOM.bodyFont.value, fontSize: parseInt(DOM.bodySize.value) },
            heading1: { fontFamily: DOM.h1Font.value, fontSize: parseInt(DOM.h1Size.value) }
        }
    };

    await chrome.runtime.sendMessage({ action: 'SAVE_TEMPLATE', template });
    hideModal(DOM.createSection);
    loadTemplates();
    showToast('Template Saved');
}

/* ============ IMPORT TEMPLATE ============ */
async function extractStyles() {
    if (!STATE.currentDocId) return showToast('No document detected');

    DOM.extractBtn.textContent = 'Extracting...';
    DOM.extractBtn.disabled = true;

    try {
        const res = await chrome.runtime.sendMessage({ action: 'EXTRACT_STYLES', docId: STATE.currentDocId });

        if (!res.success) {
            // Show specific error to user
            showToast(res.error || 'Extraction failed');
            return;
        }

        STATE.extractedStyles = res.data;
        DOM.extractedInfo.innerHTML = `
            <div class="row"><span class="badge">Body: ${res.data.body?.fontFamily || 'Unknown'} ${res.data.body?.fontSize || ''}pt</span></div>
            ${res.data.heading1 ? `<div class="row"><span class="badge">H1: ${res.data.heading1.fontFamily} ${res.data.heading1.fontSize}pt</span></div>` : ''}
        `;
        DOM.extractedInfo.classList.remove('hidden');
        DOM.importedName.classList.remove('hidden');
        DOM.saveImportedFooter.classList.remove('hidden');
        DOM.importedName.value = 'Imported Style';
        showToast('Styles extracted successfully!');

    } catch (e) {
        console.error('Extract styles error:', e);
        showToast(e.message || 'Extraction failed');
    } finally {
        DOM.extractBtn.textContent = 'Extract from Active Doc';
        DOM.extractBtn.disabled = false;
    }
}

/* ============ AI FEATURES ============ */
async function checkApiKey() {
    const stored = await chrome.storage.local.get('geminiApiKey');
    if (!stored.geminiApiKey) {
        DOM.apiKeyWarning.classList.remove('hidden');
        return false;
    }
    DOM.apiKeyWarning.classList.add('hidden');
    return true;
}

async function runAIAction(actionType) {
    if (!STATE.currentDocId) return showToast('No document detected');
    if (!await checkApiKey()) return showModal(DOM.apiKeyModal);

    DOM.resultsPanel.classList.remove('hidden');
    DOM.resultsContent.innerHTML = '<div class="loading-spinner"></div> Analyzing...';

    let action = 'AI_ANALYZE';
    if (actionType === 'fix') action = 'AI_CHECK_CONSISTENCY';
    if (actionType === 'suggest') action = 'AI_SUGGEST';

    // Get current template rules
    const selectedTemplateId = DOM.templateSelect.value;
    const selectedTemplate = STATE.templates.find(t => t.id === selectedTemplateId);
    let templateRules = null;

    if (selectedTemplate) {
        if (selectedTemplate.aiInstructions) {
            templateRules = selectedTemplate.aiInstructions;
        } else if (selectedTemplate.styles) {
            // Fallback: construct rules from styles
            templateRules = `Font: ${selectedTemplate.styles.body?.fontFamily || 'Standard'}, Size: ${selectedTemplate.styles.body?.fontSize || '11'}pt`;
        }
    }

    try {
        const res = await chrome.runtime.sendMessage({
            action,
            docId: STATE.currentDocId,
            templateRules: templateRules
        });

        if (res.success) {
            // Simple rendering for now
            const data = res.data;
            let html = '';

            if (data.suggestions) {
                html = `<ul>${data.suggestions.map(s => `<li><b>${s.issue}</b>: ${s.recommendation}</li>`).join('')}</ul>`;
            } else if (data.issues) {
                html = `<div class="issues-list">
                    <ul>${data.issues.map(i => `<li><b>${i.type}</b>: ${i.description}</li>`).join('')}</ul>
                    ${data.issues.some(i => i.actions) ? `<button id="applyFixesBtn" class="btn-primary" style="margin-top:12px; width:100%">Apply All Fixes ✨</button>` : ''}
                </div>`;

                // Store actions for the button handler
                STATE.pendingAIActions = data.issues.flatMap(i => i.actions || []);
            } else {
                html = '<div class="ai-response">' + (JSON.stringify(data, null, 2)) + '</div>';
            }

            DOM.resultsContent.innerHTML = html;

            // Attach listener for the new button
            const btn = document.getElementById('applyFixesBtn');
            if (btn) {
                btn.addEventListener('click', async () => {
                    btn.textContent = 'Applying...';
                    btn.disabled = true;
                    try {
                        await chrome.runtime.sendMessage({
                            action: 'AI_APPLY_ACTIONS',
                            docId: STATE.currentDocId,
                            actions: STATE.pendingAIActions
                        });
                        showToast('Fixes Applied Successfully! 🪄');
                        DOM.resultsContent.innerHTML = '<div class="success-message">All fixed! Document is now compliant.</div>';
                    } catch (e) {
                        DOM.resultsContent.innerHTML += `<div class="error">Failed: ${e.message}</div>`;
                    }
                });
            }
        }
    } catch (e) {
        DOM.resultsContent.innerHTML = 'Error: ' + e.message;
    }
}

/* ============ PRICING LOGIC ============ */
const PRICING = {
    pro: {
        monthly: { amount: 299, planId: 'plan_S8HkUbeANDtrsP', period: '/mo' },
        annual: { amount: 2499, planId: 'plan_S8Hm0hBBAVpqxw', period: '/yr (Save 30%)' }
    },
    business: {
        monthly: { amount: 799, planId: 'plan_S8HkUbeANDtrsP', period: '/mo' },
        annual: { amount: 6999, planId: 'plan_S8Hm0hBBAVpqxw', period: '/yr (Save 30%)' }
    }
};

let billingCycle = 'monthly';

function setupPricing() {
    // Toggles
    document.getElementById('monthlyBtn').addEventListener('click', () => setBillingCycle('monthly'));
    document.getElementById('annualBtn').addEventListener('click', () => setBillingCycle('annual'));

    // Plan Buttons
    document.getElementById('proBtn').addEventListener('click', () => selectPlan('pro'));
    document.getElementById('businessBtn').addEventListener('click', () => selectPlan('business'));

    // Navigation
    document.getElementById('backToHomeBtn').addEventListener('click', () => {
        DOM.views.forEach(v => v.classList.remove('active'));
        document.getElementById('view-home').classList.add('active');
    });

    // Upgrade triggers
    DOM.upgradeBtn.addEventListener('click', () => showView('pricing'));
}

function showView(viewName) {
    DOM.views.forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
}

function setBillingCycle(cycle) {
    billingCycle = cycle;
    document.getElementById('monthlyBtn').classList.toggle('active', cycle === 'monthly');
    document.getElementById('annualBtn').classList.toggle('active', cycle === 'annual');
    updatePrices();
}

function formatPrice(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

function updatePrices() {
    const pro = PRICING.pro[billingCycle];
    const biz = PRICING.business[billingCycle];

    document.getElementById('proPrice').textContent = formatPrice(pro.amount);
    document.getElementById('proPeriod').textContent = pro.period;

    document.getElementById('businessPrice').textContent = formatPrice(biz.amount);
    document.getElementById('businessPeriod').textContent = biz.period;
}

async function selectPlan(tier) {
    const plan = PRICING[tier][billingCycle];
    const btn = document.getElementById(`${tier}Btn`);
    const originalText = btn.textContent;

    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
        const res = await chrome.runtime.sendMessage({
            action: 'CREATE_CHECKOUT',
            planId: plan.planId,
            tier: tier
        });

        if (res.success && res.data.url) {
            // Open Checkout URL in new tab (required for secure payment page)
            chrome.tabs.create({ url: res.data.url });
        } else {
            throw new Error(res.error || 'Checkout failed');
        }
    } catch (e) {
        showToast('Error: ' + e.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

/* ============ EVENT LISTENERS ============ */
function setupEventListeners() {
    setupPricing(); // Initialize pricing listeners

    // Auth
    DOM.signInBtn.addEventListener('click', signIn);
    DOM.signOutBtn.addEventListener('click', signOut);

    // Format
    DOM.formatBtn.addEventListener('click', formatDocument);
    // DOM.upgradeBtn listener moved to setupPricing()

    DOM.templateSelect.addEventListener('change', () => {
        // Update template info tags based on selection
    });

    // Create & Import
    DOM.createBtn.addEventListener('click', () => showModal(DOM.createSection));
    DOM.cancelCreateBtn.addEventListener('click', () => hideModal(DOM.createSection));
    DOM.saveTemplateBtn.addEventListener('click', saveCreatedTemplate);

    DOM.importBtn.addEventListener('click', () => showModal(DOM.importSection));
    DOM.cancelImportBtn.addEventListener('click', () => hideModal(DOM.importSection));
    DOM.extractBtn.addEventListener('click', extractStyles);
    DOM.saveImportedBtn.addEventListener('click', async () => {
        if (STATE.extractedStyles) {
            await chrome.runtime.sendMessage({
                action: 'SAVE_TEMPLATE',
                template: {
                    name: DOM.importedName.value,
                    icon: 'IMP',
                    isPreset: false,
                    styles: STATE.extractedStyles
                }
            });
            hideModal(DOM.importSection);
            loadTemplates();
        }
    });

    // Preview
    [DOM.bodyFont, DOM.bodySize, DOM.h1Font, DOM.h1Size].forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    // AI
    DOM.configureKeyBtn.addEventListener('click', () => showModal(DOM.apiKeyModal));
    DOM.cancelKeyBtn.addEventListener('click', () => hideModal(DOM.apiKeyModal));
    DOM.saveKeyBtn.addEventListener('click', async () => {
        const key = DOM.apiKeyInput.value;
        if (key) {
            await chrome.storage.local.set({ geminiApiKey: key });
            hideModal(DOM.apiKeyModal);
            checkApiKey();
        }
    });

    DOM.analyzeBtn.addEventListener('click', () => runAIAction('analyze'));
    DOM.fixBtn.addEventListener('click', () => runAIAction('fix'));
    DOM.suggestBtn.addEventListener('click', () => runAIAction('suggest'));
    DOM.closeResultsBtn.addEventListener('click', () => DOM.resultsPanel.classList.add('hidden'));
}

// Start
init();
