// Amarika Side Panel - Template Manager

// ============ DOM ELEMENTS ============
const elements = {
    // Actions
    createBtn: document.getElementById('createBtn'),
    importBtn: document.getElementById('importBtn'),

    // Sections
    importSection: document.getElementById('importSection'),
    createSection: document.getElementById('createSection'),
    importedPreviewSection: document.getElementById('importedPreviewSection'),
    templatesSection: document.getElementById('templatesSection'),

    // Import
    cancelImportBtn: document.getElementById('cancelImportBtn'),
    importStatus: document.getElementById('importStatus'),
    importStatusIcon: document.getElementById('importStatusIcon'),
    importStatusText: document.getElementById('importStatusText'),
    extractBtn: document.getElementById('extractBtn'),

    // Create
    cancelCreateBtn: document.getElementById('cancelCreateBtn'),
    templateName: document.getElementById('templateName'),
    bodyFont: document.getElementById('bodyFont'),
    bodySize: document.getElementById('bodySize'),
    lineSpacing: document.getElementById('lineSpacing'),
    h1Font: document.getElementById('h1Font'),
    h1Size: document.getElementById('h1Size'),
    h1Bold: document.getElementById('h1Bold'),
    h2Font: document.getElementById('h2Font'),
    h2Size: document.getElementById('h2Size'),
    h2Bold: document.getElementById('h2Bold'),
    preview: document.getElementById('preview'),
    saveTemplateBtn: document.getElementById('saveTemplateBtn'),

    // Imported Preview
    cancelImportedBtn: document.getElementById('cancelImportedBtn'),
    importedName: document.getElementById('importedName'),
    extractedInfo: document.getElementById('extractedInfo'),
    saveImportedBtn: document.getElementById('saveImportedBtn'),

    // Lists
    templatesList: document.getElementById('templatesList'),
    presetsList: document.getElementById('presetsList'),

    // Toast
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage')
};

// ============ STATE ============
let currentDocId = null;
let currentDocTitle = null;
let extractedStyles = null;
let userTemplates = [];

// ============ PRESETS ============
const PRESET_TEMPLATES = [
    { id: 'ieee', name: 'IEEE Academic', icon: '📄', meta: 'Times New Roman, 12pt, Double' },
    { id: 'corporate', name: 'Corporate Professional', icon: '💼', meta: 'Times New Roman, 11pt, 1.15' },
    { id: 'apa', name: 'APA Style', icon: '📚', meta: 'Times New Roman, 12pt, Double' },
    { id: 'mla', name: 'MLA Format', icon: '📝', meta: 'Times New Roman, 12pt, Double' },
    { id: 'modern', name: 'Modern Clean', icon: '✨', meta: 'Arial, 11pt, 1.15' }
];

// ============ UTILITIES ============

function showToast(message, type = 'success') {
    elements.toastIcon.textContent = type === 'success' ? '✓' : '✕';
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast ${type}`;
    setTimeout(() => elements.toast.classList.add('show'), 10);
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

function hideAllSections() {
    elements.importSection.classList.add('hidden');
    elements.createSection.classList.add('hidden');
    elements.importedPreviewSection.classList.add('hidden');
}

function showSection(section) {
    hideAllSections();
    section.classList.remove('hidden');
}

// ============ DOCUMENT DETECTION ============

async function checkCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url && tab.url.includes('docs.google.com/document/d/')) {
            const match = tab.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            currentDocId = match ? match[1] : null;
            currentDocTitle = tab.title?.replace(' - Google Docs', '') || 'Untitled';

            if (currentDocId) {
                elements.importStatus.className = 'import-status valid';
                elements.importStatusIcon.textContent = '✅';
                elements.importStatusText.textContent = currentDocTitle;
                elements.extractBtn.disabled = false;
                return;
            }
        }

        currentDocId = null;
        elements.importStatus.className = 'import-status invalid';
        elements.importStatusIcon.textContent = '❌';
        elements.importStatusText.textContent = 'Open a Google Doc first';
        elements.extractBtn.disabled = true;
    } catch (error) {
        console.error('Tab check error:', error);
    }
}

// ============ IMPORT TEMPLATE ============

async function extractStylesFromDocument() {
    if (!currentDocId) {
        showToast('No document detected', 'error');
        return;
    }

    elements.extractBtn.disabled = true;
    elements.extractBtn.textContent = 'Extracting...';

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'EXTRACT_STYLES',
            docId: currentDocId
        });

        if (response.success && response.data) {
            extractedStyles = response.data;
            elements.importedName.value = `${currentDocTitle} Style`;
            displayExtractedStyles(extractedStyles);
            showSection(elements.importedPreviewSection);
            showToast('Styles extracted successfully!');
        } else {
            throw new Error(response.error || 'Failed to extract styles');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        elements.extractBtn.disabled = false;
        elements.extractBtn.textContent = 'Extract Styles';
    }
}

function displayExtractedStyles(styles) {
    const rows = [
        { label: 'Body Font', value: styles.body?.fontFamily || 'Times New Roman' },
        { label: 'Body Size', value: `${styles.body?.fontSize || 12}pt` },
        { label: 'Line Spacing', value: `${(styles.body?.lineSpacing || 100) / 100}` },
        { label: 'Heading 1', value: `${styles.heading1?.fontFamily || 'Arial'}, ${styles.heading1?.fontSize || 24}pt` },
        { label: 'Heading 2', value: `${styles.heading2?.fontFamily || 'Arial'}, ${styles.heading2?.fontSize || 18}pt` }
    ];

    elements.extractedInfo.innerHTML = rows.map(r => `
    <div class="extracted-row">
      <span class="extracted-label">${r.label}</span>
      <span class="extracted-value">${r.value}</span>
    </div>
  `).join('');
}

// ============ CREATE TEMPLATE ============

function updatePreview() {
    const bodyFont = elements.bodyFont.value;
    const bodySize = elements.bodySize.value;
    const lineSpacing = parseInt(elements.lineSpacing.value) / 100;
    const h1Font = elements.h1Font.value;
    const h1Size = elements.h1Size.value;
    const h1Bold = elements.h1Bold.checked;
    const h2Font = elements.h2Font.value;
    const h2Size = elements.h2Size.value;
    const h2Bold = elements.h2Bold.checked;

    elements.preview.querySelector('.preview-h1').style.cssText = `
    font-family: ${h1Font}, sans-serif;
    font-size: ${h1Size}px;
    font-weight: ${h1Bold ? 'bold' : 'normal'};
    margin-bottom: 8px;
  `;

    elements.preview.querySelector('.preview-h2').style.cssText = `
    font-family: ${h2Font}, sans-serif;
    font-size: ${h2Size}px;
    font-weight: ${h2Bold ? 'bold' : 'normal'};
    margin-bottom: 8px;
  `;

    elements.preview.querySelector('.preview-body').style.cssText = `
    font-family: "${bodyFont}", serif;
    font-size: ${bodySize}px;
    line-height: ${lineSpacing};
  `;
}

function getTemplateFromForm() {
    return {
        name: elements.templateName.value || 'Untitled Template',
        icon: '🎨',
        isPreset: false,
        styles: {
            body: {
                fontFamily: elements.bodyFont.value,
                fontSize: parseInt(elements.bodySize.value),
                lineSpacing: parseInt(elements.lineSpacing.value)
            },
            heading1: {
                fontFamily: elements.h1Font.value,
                fontSize: parseInt(elements.h1Size.value),
                bold: elements.h1Bold.checked
            },
            heading2: {
                fontFamily: elements.h2Font.value,
                fontSize: parseInt(elements.h2Size.value),
                bold: elements.h2Bold.checked
            }
        }
    };
}

// ============ SAVE TEMPLATE ============

async function saveTemplate(templateData) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'SAVE_TEMPLATE',
            template: templateData
        });

        if (response.success) {
            showToast('Template saved!');
            hideAllSections();
            loadUserTemplates();
        } else {
            throw new Error(response.error || 'Failed to save');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function saveCreatedTemplate() {
    const template = getTemplateFromForm();
    await saveTemplate(template);
}

async function saveImportedTemplate() {
    if (!extractedStyles) return;

    const template = {
        name: elements.importedName.value || 'Imported Template',
        icon: '📥',
        isPreset: false,
        importedFrom: currentDocTitle,
        styles: extractedStyles
    };

    await saveTemplate(template);
}

// ============ LOAD TEMPLATES ============

async function loadUserTemplates() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_USER_TEMPLATES' });

        if (response.success && response.data) {
            userTemplates = response.data;
            renderUserTemplates();
        }
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

function renderUserTemplates() {
    if (userTemplates.length === 0) {
        elements.templatesList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📁</span>
        <p>No custom templates yet</p>
        <p class="empty-hint">Create or import a template to get started</p>
      </div>
    `;
        return;
    }

    elements.templatesList.innerHTML = userTemplates.map(t => `
    <div class="template-item" data-id="${t.id}">
      <span class="template-icon">${t.icon || '🎨'}</span>
      <div class="template-info">
        <div class="template-name">${t.name}</div>
        <div class="template-meta">${t.styles?.body?.fontFamily || 'Custom'}, ${t.styles?.body?.fontSize || 12}pt</div>
      </div>
      <div class="template-actions">
        <button class="btn-template-action delete" data-id="${t.id}" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');

    // Add delete handlers
    elements.templatesList.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('Delete this template?')) {
                await deleteTemplate(id);
            }
        });
    });
}

function renderPresetTemplates() {
    elements.presetsList.innerHTML = PRESET_TEMPLATES.map(t => `
    <div class="template-item" data-id="${t.id}">
      <span class="template-icon">${t.icon}</span>
      <div class="template-info">
        <div class="template-name">${t.name}</div>
        <div class="template-meta">${t.meta}</div>
      </div>
    </div>
  `).join('');
}

async function deleteTemplate(templateId) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'DELETE_TEMPLATE',
            templateId
        });

        if (response.success) {
            showToast('Template deleted');
            loadUserTemplates();
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============ EVENT LISTENERS ============

// Action buttons
elements.createBtn.addEventListener('click', () => {
    showSection(elements.createSection);
    elements.templateName.focus();
});

elements.importBtn.addEventListener('click', () => {
    showSection(elements.importSection);
    checkCurrentTab();
});

// Cancel buttons
elements.cancelImportBtn.addEventListener('click', hideAllSections);
elements.cancelCreateBtn.addEventListener('click', hideAllSections);
elements.cancelImportedBtn.addEventListener('click', hideAllSections);

// Extract and save
elements.extractBtn.addEventListener('click', extractStylesFromDocument);
elements.saveTemplateBtn.addEventListener('click', saveCreatedTemplate);
elements.saveImportedBtn.addEventListener('click', saveImportedTemplate);

// Preview updates
const previewInputs = [
    elements.bodyFont, elements.bodySize, elements.lineSpacing,
    elements.h1Font, elements.h1Size, elements.h1Bold,
    elements.h2Font, elements.h2Size, elements.h2Bold
];
previewInputs.forEach(input => {
    input.addEventListener('change', updatePreview);
    input.addEventListener('input', updatePreview);
});

// ============ INITIALIZE ============

renderPresetTemplates();
loadUserTemplates();
updatePreview();

// Refresh document check periodically
setInterval(checkCurrentTab, 2000);

console.log('📋 Side Panel initialized');
