// FormatX Popup Script

// DOM Elements
const views = {
    loading: document.getElementById('loadingView'),
    login: document.getElementById('loginView'),
    main: document.getElementById('mainView')
};

const elements = {
    // Login
    signInBtn: document.getElementById('signInBtn'),

    // User
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userTier: document.getElementById('userTier'),
    signOutBtn: document.getElementById('signOutBtn'),

    // Document
    docStatus: document.getElementById('docStatus'),
    statusIcon: document.getElementById('statusIcon'),
    statusTitle: document.getElementById('statusTitle'),
    statusUrl: document.getElementById('statusUrl'),

    // Template
    templateSelect: document.getElementById('templateSelect'),
    templateInfo: document.getElementById('templateInfo'),

    // Actions
    formatBtn: document.getElementById('formatBtn'),

    // Subscription
    templateLimitText: document.getElementById('templateLimitText'),
    upgradeBanner: document.getElementById('upgradeBanner'),
    upgradeBtn: document.getElementById('upgradeBtn'),

    // Toast
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage')
};

// State
let currentUser = null;
let currentProfile = null;
let currentDocId = null;
let currentTier = 'free';
let templates = [];

// ============ VIEW MANAGEMENT ============

function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

// ============ TOAST ============

function showToast(message, type = 'success') {
    elements.toastIcon.textContent = type === 'success' ? '✓' : '✕';
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast ${type}`;

    setTimeout(() => elements.toast.classList.add('show'), 10);
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

// ============ TEMPLATE INFO ============

function updateTemplateInfo() {
    const templateId = elements.templateSelect.value;
    const template = templates.find(t => t.id === templateId);

    if (template && template.styles) {
        const styles = template.styles.body || template.styles;
        elements.templateInfo.innerHTML = `
      <span class="template-badge">${styles.fontFamily || 'Times New Roman'}</span>
      <span class="template-badge">${styles.fontSize || 12}pt</span>
    `;
    } else {
        elements.templateInfo.innerHTML = '';
    }
}

// ============ DOCUMENT DETECTION ============

async function detectDocument() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url && tab.url.includes('docs.google.com/document/d/')) {
            const match = tab.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            currentDocId = match ? match[1] : null;

            if (currentDocId) {
                elements.docStatus.className = 'doc-status valid';
                elements.statusIcon.textContent = '✅';
                elements.statusTitle.textContent = 'Google Doc Detected';
                elements.statusUrl.textContent = tab.url.length > 50
                    ? tab.url.substring(0, 50) + '...'
                    : tab.url;
                elements.formatBtn.disabled = false;
                return;
            }
        }

        // Not a Google Doc
        currentDocId = null;
        elements.docStatus.className = 'doc-status invalid';
        elements.statusIcon.textContent = '❌';
        elements.statusTitle.textContent = 'No Google Doc';
        elements.statusUrl.textContent = 'Open a Google Docs document to format';
        elements.formatBtn.disabled = true;

    } catch (error) {
        console.error('Document detection error:', error);
        elements.formatBtn.disabled = true;
    }
}

// ============ TEMPLATES ============

async function loadTemplates() {
    try {
        // Get preset templates
        const presetResponse = await chrome.runtime.sendMessage({ action: 'GET_TEMPLATES' });
        const presetTemplates = presetResponse.success ? presetResponse.data : [];

        // Get user's custom templates
        const userResponse = await chrome.runtime.sendMessage({ action: 'GET_USER_TEMPLATES' });
        const userTemplates = userResponse.success ? userResponse.data : [];

        // Combine: user templates first, then presets
        templates = [...userTemplates, ...presetTemplates];

        if (templates.length > 0) {
            elements.templateSelect.innerHTML = templates.map(t => {
                const styles = t.styles.body || t.styles;
                const label = t.isPreset ? '' : ' ★';
                return `<option value="${t.id}">${t.icon || '📄'} ${t.name}${label}</option>`;
            }).join('');
        }

        updateTemplateInfo();
    } catch (error) {
        console.error('Failed to load templates:', error);
        elements.templateSelect.innerHTML = `
      <option value="ieee">📄 IEEE Academic</option>
      <option value="corporate">💼 Corporate Professional</option>
    `;
    }
}

// ============ SUBSCRIPTION ============

async function loadSubscriptionStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_SUBSCRIPTION' });

        if (response.success && response.data) {
            currentTier = response.data.tier;

            // Update tier badge
            elements.userTier.textContent = currentTier.charAt(0).toUpperCase() + currentTier.slice(1);
            elements.userTier.className = `user-tier ${currentTier}`;

            // Update template limit display
            const templates = response.data.templates;
            if (elements.templateLimitText) {
                elements.templateLimitText.textContent = `Templates: ${templates.current}/${templates.limit}`;
            }

            // Show/hide upgrade banner based on tier
            if (currentTier === 'free') {
                elements.upgradeBanner?.classList.remove('hidden');
            } else {
                elements.upgradeBanner?.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to load subscription:', error);
    }
}

// ============ AUTH ============

async function checkAuth() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_USER' });

        if (response.success && response.data) {
            currentUser = response.data;

            // Get full profile
            const profileResponse = await chrome.runtime.sendMessage({ action: 'GET_PROFILE' });
            if (profileResponse.success && profileResponse.data) {
                currentProfile = profileResponse.data;
                elements.userAvatar.src = currentProfile.photoURL || '../icons/logo.png';
                elements.userName.textContent = currentProfile.displayName || currentProfile.email;
            }

            // Load subscription status
            await loadSubscriptionStatus();

            await loadTemplates();
            await detectDocument();
            showView('main');
        } else {
            showView('login');
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showView('login');
    }
}

async function signIn() {
    elements.signInBtn.disabled = true;
    elements.signInBtn.innerHTML = '<span>Signing in...</span>';

    try {
        const response = await chrome.runtime.sendMessage({ action: 'SIGN_IN' });

        if (response.success) {
            currentUser = response.data;
            await checkAuth();
            showToast('Signed in successfully!');
        } else {
            throw new Error(response.error || 'Sign in failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
        elements.signInBtn.disabled = false;
        elements.signInBtn.innerHTML = `
      <img src="../assets/google-icon.svg" alt="Google" width="18">
      <span>Sign in with Google</span>
    `;
    }
}

async function signOut() {
    try {
        await chrome.runtime.sendMessage({ action: 'SIGN_OUT' });
        currentUser = null;
        currentProfile = null;
        showView('login');
        showToast('Signed out');
    } catch (error) {
        showToast('Sign out failed', 'error');
    }
}

// ============ FORMAT DOCUMENT ============

async function formatDocument() {
    if (!currentDocId) {
        showToast('No document detected', 'error');
        return;
    }

    const templateId = elements.templateSelect.value;

    elements.formatBtn.classList.add('loading');
    elements.formatBtn.disabled = true;

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'FORMAT_DOC',
            docId: currentDocId,
            templateId: templateId
        });

        if (response.success) {
            showToast('Document formatted! Refresh to see changes.');

            // Refresh subscription status
            await loadSubscriptionStatus();
        } else {
            throw new Error(response.error || 'Formatting failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        elements.formatBtn.classList.remove('loading');
        elements.formatBtn.disabled = false;
    }
}

// ============ EVENT LISTENERS ============

elements.signInBtn.addEventListener('click', signIn);
elements.signOutBtn.addEventListener('click', signOut);
elements.formatBtn.addEventListener('click', formatDocument);
elements.templateSelect.addEventListener('change', updateTemplateInfo);

// Upgrade button - Open pricing page
elements.upgradeBtn?.addEventListener('click', () => {
    window.location.href = 'pricing.html';
});

// AI Assistant button
const aiBtn = document.getElementById('aiBtn');
aiBtn?.addEventListener('click', () => {
    window.location.href = 'ai-assistant.html';
});

// Manage Templates - Open Side Panel
const manageTemplatesBtn = document.getElementById('manageTemplatesBtn');
manageTemplatesBtn?.addEventListener('click', async () => {
    try {
        // Open the side panel
        await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
        window.close(); // Close popup
    } catch (error) {
        console.log('Side panel error:', error);
        showToast('Open Side Panel from browser menu', 'error');
    }
});

// ============ INITIALIZE ============

checkAuth();
