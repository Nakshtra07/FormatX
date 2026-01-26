# Amarika - Google Docs Formatter

A Chrome extension that formats Google Docs with professional templates (IEEE, Corporate, Custom).

![Amarika Icon](icons/logo.png)

## Features

- 🔄 **Auto-detect** - Automatically grabs URL from current tab
- 📄 **IEEE Template** - Academic formatting (Times New Roman, 12pt, double-spaced)
- 💼 **Corporate Template** - Professional formatting (Times New Roman, 11pt)
- ⚙️ **Custom Template** - Configurable formatting (Arial, 11pt)
- ✨ **One-click formatting** - Just select template and click!

## Setup

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or use existing)
3. Enable **Google Docs API** and **Google Drive API**
4. Go to **OAuth consent screen** → Add yourself as a test user
5. Create **OAuth 2.0 Client ID**:
   - Type: **Chrome Extension**
   - Item ID: Your extension ID (get from chrome://extensions)

### 2. Configure the Extension

1. Copy `manifest.template.json` to `manifest.json`
2. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID
3. Load the extension in Chrome:
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select this folder

### 3. Use the Extension

1. Open any Google Docs document
2. Click the Amarika extension icon
3. Select a template
4. Click **Format Document**

## Templates

| Template | Font | Size | Line Spacing |
|----------|------|------|--------------|
| IEEE Academic | Times New Roman | 12pt | Double (200%) |
| Corporate | Times New Roman | 11pt | 1.15 |
| Custom | Arial | 11pt | 1.15 |

## File Structure

```
amarika-extension/
├── manifest.json          # Your local config (gitignored)
├── manifest.template.json # Template for sharing
├── background.js          # Service worker
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── icons/                 # Extension icons
└── templates/             # Formatting templates
    ├── ieee.json
    ├── corporate.json
    └── custom.json
```

## License

MIT
