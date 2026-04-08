---
sidebar_position: 1
---

# System Design & Architecture

## Executive Summary

The **AI Document Reformatter** (internal name: `formatx`) is a web-based application designed to restructure and format unorganized text into professional academic documents using AI.

**Key Findings:**
-   **AI Engine:** The project actively uses **Google Gemini (Flash 2.5)** via the `google-generativeai` library.
-   **Architecture:** A standard 3-tier architecture: React Frontend, FastAPI Backend, and Google Cloud Services (OAuth & Gemini).
-   **Status:** Early development/alpha stage.

## System Architecture

```mermaid
graph TD
    User[User] -->|Browser| Frontend[React Frontend (Vite)]
    User -->|Browser| Marketing[Marketing Site (HTML/CSS)]
    
    subgraph "Application"
        Frontend -->|REST API| Backend[FastAPI Backend]
        Frontend -->|Auth| GoogleAuth[Google OAuth 2.0]
    end
    
    subgraph "Backend Services"
        Backend -->|Process| AIEngine[AI Engine Service]
        AIEngine -->|API Call| Gemini[Google Gemini API]
        Backend -->|Docs API| GDocs[Google Docs API]
    end
```

## Technology Stack

| Component | Technology | Details |
|-----------|------------|---------|
| **Frontend** | React 18 + Vite | Uses `react-router-dom` for routing, `lucide-react` for icons, and `@react-oauth/google` for auth. |
| **Backend** | Python + FastAPI | Async web server. Uses `uvicorn` as ASGI server. |
| **AI Model** | Google Gemini | Defaults to `gemini-2.5-flash`. Logic located in `services/ai_engine.py`. |
| **Authentication** | Google OAuth 2.0 | Handled via frontend SDK and backend verification. |
| **Document Processing** | `python-docx`, `pdfplumber` | For handling DOCX and PDF inputs. |

## Code Structure

### Backend (`/backend`)
-   **`main.py`**: Entry point. Sets up FastAPI app, CORS, and routes.
-   **`config.py`**: Handles environment variables (`.env`). Critical settings: `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`.
-   **`routes/`**: API endpoints.
    -   `auth.py`: OAuth token exchange and user info.
    -   `documents.py`: Endpoints for document formatting and retrieval.
-   **`services/`**: Business logic.
    -   `ai_engine.py`: **Core Logic.** Interfaces with Gemini. Includes a robust "Demo Mode" with hardcoded responses for testing.
    -   `google_docs.py`: Interaction with Google Docs API.
    -   `template_engine.py`: Manages the output format structure.

### Frontend (`/frontend`)
-   **`src/App.jsx`**: Main router. Protected routes wrapper logic (`Dashboard` is protected).
-   **`src/pages/`**:
    -   `Landing.jsx`: Public landing page with login trigger.
    -   `Dashboard.jsx`: Main user interface for uploading/pasting text and selecting templates.

### Marketing Site (`/marketing`)
-   **`index.html`**: Standalone HTML landing page.
-   **`style.css`**: Styling for the marketing site.
