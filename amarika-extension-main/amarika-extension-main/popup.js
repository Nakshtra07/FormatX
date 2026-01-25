// popup.js - Amarika Extension (Auto URL Detection)

// Template configurations
const templateConfig = {
    ieee: { font: 'Times New Roman', size: '12pt' },
    corporate: { font: 'Times New Roman', size: '11pt' },
    custom: { font: 'Arial', size: '11pt' }
};

// State
let currentDocId = null;
let currentUrl = null;

// DOM Elements
const statusCard = document.getElementById('statusCard');
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusUrl = document.getElementById('statusUrl');
const templateSelect = document.getElementById('template');
const templateInfo = document.getElementById('templateInfo');
const formatBtn = document.getElementById('formatBtn');
const toast = document.getElementById('toast');

// Extract document ID from Google Docs URL
function extractDocId(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

// Check if URL is a Google Docs URL
function isGoogleDocsUrl(url) {
    return url && url.includes('docs.google.com/document/d/');
}

// Update UI based on detected URL
function updateStatus(url) {
    currentUrl = url;

    if (isGoogleDocsUrl(url)) {
        currentDocId = extractDocId(url);
        statusCard.className = 'status-card valid';
        statusIcon.textContent = '✅';
        statusTitle.textContent = 'Google Doc Detected';
        statusUrl.textContent = url.length > 60 ? url.substring(0, 60) + '...' : url;
        formatBtn.disabled = false;
    } else {
        currentDocId = null;
        statusCard.className = 'status-card invalid';
        statusIcon.textContent = '❌';
        statusTitle.textContent = 'Not a Google Doc';
        statusUrl.textContent = 'Please open a Google Docs document in this tab';
        formatBtn.disabled = true;
    }
}

// Update template info badges
function updateTemplateInfo() {
    const template = templateSelect.value;
    const config = templateConfig[template];
    templateInfo.innerHTML = `
    <span class="template-badge">${config.font}</span>
    <span class="template-badge">${config.size}</span>
  `;
}

// Show toast notification
function showToast(message, type = 'success') {
    const icon = type === 'success' ? '✓' : '✕';
    toast.querySelector('.toast-icon').textContent = icon;
    toast.querySelector('.toast-message').textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// Set loading state
function setLoading(loading) {
    if (loading) {
        formatBtn.classList.add('loading');
        formatBtn.disabled = true;
    } else {
        formatBtn.classList.remove('loading');
        formatBtn.disabled = !currentDocId;
    }
}

// Get current tab URL
async function getCurrentTabUrl() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            updateStatus(tab.url);
        } else {
            updateStatus(null);
        }
    } catch (err) {
        console.error('Failed to get tab URL:', err);
        updateStatus(null);
    }
}

// Handle format button click
formatBtn.addEventListener('click', async () => {
    if (!currentDocId) {
        showToast('No Google Doc detected', 'error');
        return;
    }

    const template = templateSelect.value;
    setLoading(true);

    try {
        chrome.runtime.sendMessage(
            { action: 'FORMAT_DOC', docId: currentDocId, template },
            (response) => {
                setLoading(false);

                if (chrome.runtime.lastError) {
                    showToast('Extension error: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }

                if (response && response.success) {
                    showToast('Document formatted! Refresh to see changes.', 'success');
                } else if (response && response.error) {
                    showToast(response.error, 'error');
                }
            }
        );
    } catch (err) {
        setLoading(false);
        showToast('Failed to format document', 'error');
    }
});

// Template change handler
templateSelect.addEventListener('change', updateTemplateInfo);

// Initialize
updateTemplateInfo();
getCurrentTabUrl();
