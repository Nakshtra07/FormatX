# AI Document Reformatter

Transform messy documents into professionally formatted academic papers using AI. Connect your Google Docs, select a template, and let AI restructure your content instantly.

![AI Document Reformatter](https://img.shields.io/badge/Status-Development-yellow) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![React](https://img.shields.io/badge/React-18-61DAFB)

## Features

- 🔐 **Google OAuth Integration** - Securely connect your Google account
- 📄 **Google Docs API** - Direct read/write access to your documents
- 🤖 **AI-Powered Formatting** - GPT-4 powered section detection and restructuring
- 📋 **Academic Templates** - Pre-built formats for reports, projects, and more
- ⚡ **One-Click Formatting** - Paste URL, select template, click format

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite |
| Backend | Python + FastAPI |
| AI Engine | OpenAI GPT-4o-mini |
| Auth | Google OAuth 2.0 |
| Docs API | Google Docs REST API |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Cloud Project with OAuth 2.0 credentials
- OpenAI API key

### 1. Clone & Setup

```bash
cd f:\know_code_prealpha
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your credentials
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.example .env
# Edit .env with your Google Client ID
```

### 4. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "AI Doc Reformatter")
3. Enable these APIs:
   - Google Docs API
   - Google Drive API
4. Configure OAuth Consent Screen:
   - User Type: External
   - Add scopes: `./auth/documents`, `./auth/drive.file`
   - Add test users (your email)
5. Create OAuth 2.0 Credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:5501`
   - Authorized redirect URIs: `http://localhost:5501`
6. Copy Client ID and Client Secret to your `.env` files

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5501` and sign in with Google!

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Environment config
│   ├── routes/
│   │   ├── auth.py          # Google OAuth endpoints
│   │   └── documents.py     # Document formatting endpoints
│   ├── services/
│   │   ├── google_docs.py   # Docs API client
│   │   ├── ai_engine.py     # OpenAI integration
│   │   ├── template_engine.py
│   │   └── instruction_generator.py
│   └── templates/
│       └── college_report.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── pages/
│   │       ├── Landing.jsx
│   │       └── Dashboard.jsx
│   └── package.json
└── README.md
```

## Available Templates

| Template | Description |
|----------|-------------|
| College Report | Standard academic report with abstract, intro, conclusion |
| Internship Report | Format for internship/industrial training documentation |
| Mini Project | Project report with problem statement and implementation |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/google/token` | Exchange OAuth code for tokens |
| POST | `/auth/google/refresh` | Refresh access token |
| GET | `/auth/google/userinfo` | Get user profile |
| POST | `/documents/format` | Format a Google Doc |
| GET | `/documents/info` | Get document info |
| GET | `/documents/templates` | List available templates |

## Contributing

This is a prototype project. Feel free to fork and extend!

## License

MIT
