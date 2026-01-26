# Amarika

# Amarika - Extension


<p align="center">
  <strong>Format Google Docs with professional templates, AI-powered suggestions, and custom styles</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#templates">Templates</a> •
  <a href="#subscription">Pricing</a>
</p>

---

## Features

### Professional Templates
- **IEEE Academic** - Perfect for research papers with 10pt Times New Roman, justified text, proper margins, and heading styles
- **APA Style** - Standard academic formatting with double spacing
- **MLA Format** - Modern Language Association standards
- **Corporate Professional** - Clean business document formatting
- **Modern Clean** - Contemporary Arial-based styling

### AI-Powered Formatting (Pro)
- **Document Analysis** - Automatically detect document type and suggest appropriate templates
- **Style Suggestions** - Get intelligent recommendations for improving your document's formatting
- **Consistency Checker** - Find and fix mixed fonts, irregular spacing, and formatting inconsistencies
- **Natural Language Commands** - Simply type "Make it double spaced" or "Change font to Arial"

### Custom Templates
- Create your own templates with custom fonts, sizes, and styles
- Import styles from any existing Google Doc
- Save and reuse templates across documents

## Installation

### From Chrome Web Store
*(Coming Soon)*

### Manual Installation (Developer Mode)

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/yourusername/amarika-extension.git
   ```

2. **Configure Firebase** (Required):
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Google Sign-In) and Firestore
   - Update `lib/firebase-config.js` with your project credentials

3. **Configure Google OAuth**:
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
   - Add your extension ID to authorized origins
   - Update the `client_id` in `manifest.json`

4. **Load the Extension**:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `amarika-extension` folder

5. **Pin the Extension** (Recommended):
   - Click the puzzle icon in Chrome toolbar
   - Find "Amarika" and click the pin icon

---

## Usage

### Quick Format
1. Open any **Google Doc** in your browser
2. Click the **Amarika icon** in your toolbar (or use the side panel)
3. Select a **template** from the dropdown
4. Click **Format Document**

### Using the Side Panel
1. Right-click the Amarika icon → "Open Side Panel"
2. The side panel stays open while you work
3. Switch between **Home**, **Templates**, and **AI** tabs

### Creating Custom Templates
1. Go to the **Templates** tab
2. Click **Create**
3. Configure fonts and sizes for body text and headings
4. Preview your changes in real-time
5. Click **Save Template**

### Importing Styles from a Document
*(Pro Feature)*
1. Open the Google Doc with styles you want to copy
2. Go to **Templates** → **Import**
3. Click **Extract from Active Doc**
4. Name your template and save

### Using AI Features
*(Pro Feature)*
1. Configure your **Gemini API key** (AI tab → Configure)
2. Open a Google Doc
3. Use the AI buttons:
   - **Analyze** - Detect document type and get template suggestions
   - **Fix** - Find and fix formatting inconsistencies
   - **Suggest** - Get improvement recommendations
4. Or type natural language commands like:
   - "Make headings bold"
   - "Set line spacing to 1.5"
   - "Change font to Georgia"

---

## Project Structure

```
amarika-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Core logic (auth, formatting, API calls)
├── sidepanel/
│   ├── sidepanel.html         # Main side panel UI
│   ├── sidepanel.css          # Styles
│   └── sidepanel.js           # Side panel logic
├── popup/
│   ├── popup.html/css/js      # Extension popup
│   ├── pricing.html/css/js    # Pricing page
│   ├── checkout.html/js       # Razorpay checkout
│   └── ai-assistant.*         # AI interface
├── lib/
│   ├── firebase-config.js     # Firebase configuration
│   ├── templates.js           # Template utilities
│   ├── subscription.js        # Subscription tier logic
│   └── ai-engine.js           # Gemini AI integration
├── templates/
│   ├── ieee.json              # Detailed IEEE format spec
│   ├── corporate.json         # Corporate template
│   └── custom.json            # Custom template schema
├── firebase/
│   └── functions/             # Cloud Functions for Razorpay
├── icons/
│   └── logo.png               # Extension icon
└── assets/
    └── google-icon.svg        # Google sign-in button
```

---

## Configuration

### Environment Setup

1. **Firebase Config** (`lib/firebase-config.js`):
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     // ... other config
   };
   ```

2. **Google OAuth** (`manifest.json`):
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/documents",
       "https://www.googleapis.com/auth/drive.file"
     ]
   }
   ```

3. **Gemini AI** (Optional):
   - Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Configure in the extension's AI tab

### Deploying Cloud Functions

```bash
cd firebase/functions
npm install
firebase deploy --only functions
```

---

## Template Format

Templates use a JSON structure with style definitions:

```json
{
  "id": "custom-template",
  "name": "My Template",
  "styles": {
    "body": {
      "fontFamily": "Times New Roman",
      "fontSize": 12,
      "lineSpacing": 200,
      "alignment": "JUSTIFIED"
    },
    "heading1": {
      "fontFamily": "Arial",
      "fontSize": 14,
      "bold": true,
      "alignment": "CENTER"
    }
  },
  "layout": {
    "margins": {
      "top": 72,
      "bottom": 72,
      "left": 72,
      "right": 72
    }
  }
}
```

---

## Permissions Explained

| Permission | Why It's Needed |
|------------|-----------------|
| `identity` | Google Sign-In authentication |
| `storage` | Save user preferences and templates |
| `activeTab` | Detect current Google Doc URL |
| `tabs` | Read document ID from browser tab |
| `sidePanel` | Display the side panel interface |

---

## Troubleshooting

### "This operation is not supported for this document"
- The document may be a Word/PDF file opened in Google Docs
- **Solution**: Convert it first via **File → Save as Google Docs**

### "Import from Doc is a Pro feature"
- Style import requires a Pro subscription
- **Solution**: Upgrade to Pro or create templates manually

### Extension not detecting document
- Ensure you're on a Google Docs URL (`docs.google.com/document/d/...`)
- Try refreshing the page

### Sign-in not working
- Check that OAuth is properly configured
- Ensure the extension ID matches your OAuth authorized origins

---


# What Amarika Web- App Does

- Accepts a Google Docs link or a DOCX file  
- Extracts document content and structure  
- Automatically applies consistent formatting  
- Outputs a formatted Google Doc  
- Refreshing the original link shows the formatted document  
- Allows users to upload a pre-made DOCX file as a custom template  

---

## Key Features

- **Google Docs Integration**  
  Paste a Google Docs link and get it reformatted instantly.

- **DOCX Support**  
  Upload `.docx` files for formatting or use them as custom templates.

- **Custom Templates**  
  Use an existing DOCX file to define formatting rules and apply them to other documents.

- **Instant Formatting**  
  Formatting happens almost immediately with minimal wait time.

- **Google Authentication**  
  Secure access using Google Sign-In.

- **Web-Based**  
  No installation required — works directly from the browser.

---

## How It Works (High Level)

1. User signs in using Google Authentication  
2. User pastes a Google Docs link or uploads a DOCX file  
3. Amarika extracts the document content and structure  
4. Formatting rules (default or custom template) are applied  
5. The original document link now points to the formatted version  

---

## Tech Stack

### Frontend
- HTML  
- CSS  
- JavaScript  
- React.js  

### Backend
- Python  
- Flask  

### Authentication
- Google OAuth  

### Hosting
- Deployed (cloud-hosted)

---

## Target Audience

- Students  
- Researchers  
- Professionals  
- Content creators  


## Future Integrations & Roadmap

Planned ideas for future versions of Amarika include:

- Support for additional output formats (PDF, DOCX download)  
- More advanced custom template controls  
- Team-based document formatting  
- Formatting previews and analytics  
- Optional AI-assisted formatting suggestions  
- Public API access for developers  

## License

MIT License - See [LICENSE](LICENSE) for details.


## Acknowledgments

- [Google Docs API](https://developers.google.com/docs/api)
- [Google Gemini AI](https://ai.google.dev/)
- [Firebase](https://firebase.google.com/)
- [Razorpay](https://razorpay.com/)

<p align="center">
  Made with ❤️ by <b>Team Nexus</b> for better document formatting
</p>

