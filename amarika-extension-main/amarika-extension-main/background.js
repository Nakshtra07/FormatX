// background.js - Amarika Extension Service Worker

// Get OAuth token
function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, token => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

// Get document details to find actual length
async function getDocumentLength(docId, token) {
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to read document`);
  }

  const doc = await res.json();
  // Get the end index from the document body content
  const content = doc.body?.content || [];
  let endIndex = 1;

  for (const element of content) {
    if (element.endIndex && element.endIndex > endIndex) {
      endIndex = element.endIndex;
    }
  }

  return endIndex - 1; // Subtract 1 to stay within bounds
}

// Format document using Google Docs API
async function formatDocument(docId, template, token) {
  // Load template rules
  const rulesUrl = chrome.runtime.getURL(`templates/${template}.json`);
  const rulesResponse = await fetch(rulesUrl);

  if (!rulesResponse.ok) {
    throw new Error(`Template "${template}" not found`);
  }

  const rules = await rulesResponse.json();

  // Get actual document length
  const docLength = await getDocumentLength(docId, token);

  if (docLength < 2) {
    throw new Error('Document is empty or too short to format');
  }

  // Build formatting requests with actual document length
  const requests = [
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: docLength },
        textStyle: {
          fontSize: { magnitude: rules.fontSize, unit: "PT" },
          weightedFontFamily: { fontFamily: rules.font }
        },
        fields: "fontSize,weightedFontFamily"
      }
    }
  ];

  // Add line spacing if specified
  if (rules.lineSpacing) {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: docLength },
        paragraphStyle: {
          lineSpacing: rules.lineSpacing
        },
        fields: "lineSpacing"
      }
    });
  }

  // Send batch update to Google Docs API
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ requests })
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `API Error: ${res.status}`;
    throw new Error(errorMessage);
  }

  return await res.json();
}

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== "FORMAT_DOC") return false;

  (async () => {
    try {
      const token = await getAuthToken();
      await formatDocument(msg.docId, msg.template, token);
      console.log("✅ Document formatted successfully");
      sendResponse({ success: true });
    } catch (err) {
      console.error("❌ Formatting failed:", err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Log when service worker starts
console.log("🚀 Amarika service worker initialized");