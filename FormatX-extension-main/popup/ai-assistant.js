// FormatX AI Assistant - Frontend Script

// DOM Elements
const elements = {
    // Warning / Config
    apiKeyWarning: document.getElementById('apiKeyWarning'),
    configureKeyBtn: document.getElementById('configureKeyBtn'),

    // Document status
    docStatus: document.getElementById('docStatus'),
    docStatusIcon: document.getElementById('docStatusIcon'),
    docStatusText: document.getElementById('docStatusText'),

    // Action buttons
    backBtn: document.getElementById('backBtn'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    fixBtn: document.getElementById('fixBtn'),
    suggestBtn: document.getElementById('suggestBtn'),

    // Command input
    commandInput: document.getElementById('commandInput'),
    sendCommandBtn: document.getElementById('sendCommandBtn'),

    // Results
    resultsPanel: document.getElementById('resultsPanel'),
    resultsTitle: document.getElementById('resultsTitle'),
    resultsContent: document.getElementById('resultsContent'),
    resultsActions: document.getElementById('resultsActions'),
    applyResultBtn: document.getElementById('applyResultBtn'),
    closeResultsBtn: document.getElementById('closeResultsBtn'),

    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),

    // Modal
    apiKeyModal: document.getElementById('apiKeyModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    cancelKeyBtn: document.getElementById('cancelKeyBtn')
};

// State
let currentDocId = null;
let pendingActions = null;

// ============ UTILITIES ============

function showLoading(text = 'Analyzing with AI...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showResults(title, content, showApply = false) {
    elements.resultsTitle.textContent = title;
    elements.resultsContent.innerHTML = content;
    elements.resultsActions.classList.toggle('hidden', !showApply);
    elements.resultsPanel.classList.remove('hidden');
    setTimeout(() => elements.resultsPanel.classList.add('show'), 10);
}

function hideResults() {
    elements.resultsPanel.classList.remove('show');
    setTimeout(() => elements.resultsPanel.classList.add('hidden'), 300);
}

// ============ API KEY ============

async function checkApiKey() {
    const stored = await chrome.storage.local.get('geminiApiKey');
    if (!stored.geminiApiKey) {
        elements.apiKeyWarning.classList.remove('hidden');
        return false;
    }
    elements.apiKeyWarning.classList.add('hidden');
    return true;
}

async function saveApiKey() {
    const key = elements.apiKeyInput.value.trim();
    if (!key) return;

    await chrome.storage.local.set({ geminiApiKey: key });
    elements.apiKeyModal.classList.add('hidden');
    elements.apiKeyWarning.classList.add('hidden');
    elements.apiKeyInput.value = '';
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
                elements.docStatusIcon.textContent = '✅';
                elements.docStatusText.textContent = tab.title?.replace(' - Google Docs', '') || 'Document ready';
                return;
            }
        }

        currentDocId = null;
        elements.docStatus.className = 'doc-status invalid';
        elements.docStatusIcon.textContent = '❌';
        elements.docStatusText.textContent = 'Open a Google Doc first';
    } catch (error) {
        console.error('Detection error:', error);
    }
}

// ============ AI ACTIONS ============

async function analyzeDocument() {
    if (!currentDocId) {
        alert('Please open a Google Doc first');
        return;
    }

    if (!await checkApiKey()) {
        elements.apiKeyModal.classList.remove('hidden');
        return;
    }

    showLoading('Analyzing document...');

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'AI_ANALYZE',
            docId: currentDocId
        });

        if (!response.success) throw new Error(response.error);

        const result = response.data;
        const typeLabels = {
            academic_paper: '📚 Academic Paper',
            business_report: '💼 Business Report',
            creative_writing: '✍️ Creative Writing',
            technical_doc: '⚙️ Technical Document',
            letter: '✉️ Letter',
            resume: '📋 Resume'
        };

        const content = `
      <div class="result-card success">
        <h3>${typeLabels[result.documentType] || '📄 Document'}</h3>
        <p>${result.reasoning}</p>
        <div style="margin-top: 12px">
          <span class="result-badge ${result.documentType?.split('_')[0]}">${result.suggestedTemplate?.toUpperCase()} Template Recommended</span>
        </div>
      </div>
      ${result.suggestions?.length ? `
        <div class="result-card">
          <h3>💡 Suggestions</h3>
          <ul>
            ${result.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

        pendingActions = { template: result.suggestedTemplate };
        showResults('Document Analysis', content, true);
        elements.applyResultBtn.textContent = `Apply ${result.suggestedTemplate?.toUpperCase()} Template`;

    } catch (error) {
        alert('Analysis failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function getSuggestions() {
    if (!currentDocId) {
        alert('Please open a Google Doc first');
        return;
    }

    if (!await checkApiKey()) {
        elements.apiKeyModal.classList.remove('hidden');
        return;
    }

    showLoading('Getting AI suggestions...');

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'AI_SUGGEST',
            docId: currentDocId
        });

        if (!response.success) throw new Error(response.error);

        const result = response.data;

        const content = `
      <div class="result-card">
        <h3>📊 Assessment</h3>
        <p>${result.overallAssessment}</p>
      </div>
      ${result.suggestions?.map(s => `
        <div class="result-card ${s.priority === 'high' ? 'warning' : ''}">
          <h3>${s.priority === 'high' ? '⚠️' : '💡'} ${s.category}</h3>
          <p><strong>Issue:</strong> ${s.issue}</p>
          <p><strong>Fix:</strong> ${s.recommendation}</p>
        </div>
      `).join('') || '<p>No issues found!</p>'}
    `;

        if (result.quickFixes?.length) {
            pendingActions = { quickFixes: result.quickFixes };
        }

        showResults('AI Suggestions', content, !!result.quickFixes?.length);
        if (result.quickFixes?.length) {
            elements.applyResultBtn.textContent = 'Apply Quick Fixes';
        }

    } catch (error) {
        alert('Failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function checkConsistency() {
    if (!currentDocId) {
        alert('Please open a Google Doc first');
        return;
    }

    if (!await checkApiKey()) {
        elements.apiKeyModal.classList.remove('hidden');
        return;
    }

    showLoading('Checking for issues...');

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'AI_CHECK_CONSISTENCY',
            docId: currentDocId
        });

        if (!response.success) throw new Error(response.error);

        const result = response.data;

        const content = `
      <div class="result-card ${result.hasIssues ? 'warning' : 'success'}">
        <h3>${result.hasIssues ? '⚠️' : '✅'} Consistency Score: ${result.overallScore}/100</h3>
        <p>${result.summary}</p>
      </div>
      ${result.issues?.map(issue => `
        <div class="result-card">
          <h3>🔧 ${issue.type.replace(/_/g, ' ')}</h3>
          <p>${issue.description}</p>
          <p style="color: #10b981; font-size: 12px;"><strong>Fix:</strong> ${issue.fix}</p>
        </div>
      `).join('') || ''}
    `;

        showResults('Consistency Check', content, false);

    } catch (error) {
        alert('Check failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function sendCommand() {
    const command = elements.commandInput.value.trim();
    if (!command) return;

    if (!currentDocId) {
        alert('Please open a Google Doc first');
        return;
    }

    if (!await checkApiKey()) {
        elements.apiKeyModal.classList.remove('hidden');
        return;
    }

    showLoading('Processing command...');

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'AI_COMMAND',
            docId: currentDocId,
            command: command
        });

        if (!response.success) throw new Error(response.error);

        const result = response.data;

        if (!result.understood) {
            const content = `
        <div class="result-card warning">
          <h3>❓ Clarification Needed</h3>
          <p>${result.clarificationNeeded || "I didn't understand that command. Try rephrasing."}</p>
        </div>
      `;
            showResults('Command', content, false);
            return;
        }

        const content = `
      <div class="result-card success">
        <h3>✅ Command Understood</h3>
        <p>${result.confirmation}</p>
      </div>
      <div class="result-card">
        <h3>📋 Actions to Apply</h3>
        <ul>
          ${result.actions.map(a => `<li><strong>${a.type}</strong>: ${a.value} (${a.target})</li>`).join('')}
        </ul>
      </div>
    `;

        pendingActions = { nlActions: result.actions };
        showResults('Apply Changes?', content, true);
        elements.applyResultBtn.textContent = 'Apply Formatting';

    } catch (error) {
        alert('Command failed: ' + error.message);
    } finally {
        hideLoading();
        elements.commandInput.value = '';
    }
}

async function applyPendingActions() {
    if (!pendingActions || !currentDocId) return;

    showLoading('Applying changes...');

    try {
        if (pendingActions.template) {
            await chrome.runtime.sendMessage({
                action: 'FORMAT_DOC',
                docId: currentDocId,
                templateId: pendingActions.template
            });
        } else if (pendingActions.nlActions) {
            await chrome.runtime.sendMessage({
                action: 'AI_APPLY_ACTIONS',
                docId: currentDocId,
                actions: pendingActions.nlActions
            });
        } else if (pendingActions.quickFixes) {
            // Apply first quick fix
            await chrome.runtime.sendMessage({
                action: 'AI_APPLY_ACTIONS',
                docId: currentDocId,
                actions: pendingActions.quickFixes[0]?.actions || []
            });
        }

        hideResults();
        alert('✅ Changes applied! Refresh the document to see them.');

    } catch (error) {
        alert('Failed to apply: ' + error.message);
    } finally {
        hideLoading();
        pendingActions = null;
    }
}

// ============ EVENT LISTENERS ============

elements.backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
});

elements.analyzeBtn.addEventListener('click', analyzeDocument);
elements.suggestBtn.addEventListener('click', getSuggestions);
elements.fixBtn.addEventListener('click', checkConsistency);

elements.sendCommandBtn.addEventListener('click', sendCommand);
elements.commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendCommand();
});

// Suggestion chips
document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        elements.commandInput.value = chip.dataset.command;
        elements.commandInput.focus();
    });
});

elements.closeResultsBtn.addEventListener('click', hideResults);
elements.applyResultBtn.addEventListener('click', applyPendingActions);

// API Key modal
elements.configureKeyBtn.addEventListener('click', () => {
    elements.apiKeyModal.classList.remove('hidden');
});
elements.cancelKeyBtn.addEventListener('click', () => {
    elements.apiKeyModal.classList.add('hidden');
});
elements.saveKeyBtn.addEventListener('click', saveApiKey);

// ============ INITIALIZE ============

detectDocument();
checkApiKey();
