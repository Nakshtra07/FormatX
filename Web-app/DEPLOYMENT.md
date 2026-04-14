# Deploying FormatX to Render

This project has 3 components (Marketing Site, Web App, Backend). All 3 are deployed as separate services on **Render** from the same GitHub repository using a `render.yaml` blueprint.

## Prerequisites
1. Push this code to a GitHub repository.
2. Log in to [Render](https://render.com).

---

## Quick Deploy (Blueprint)

1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **"New"** → **"Blueprint"**.
3. Connect your GitHub repository.
4. Render will detect the `render.yaml` file and create all 3 services automatically.
5. **Set secret environment variables** in the Render dashboard for each service (see below).

---

## Services Overview

| Service | Type | Root Dir | URL Pattern |
|---------|------|----------|-------------|
| `formatx-api` | Web Service (Python) | `Web-app/backend` | `https://formatx-api.onrender.com` |
| `formatx-app` | Static Site (Vite) | `Web-app/frontend` | `https://formatx-app.onrender.com` |
| `formatx-marketing` | Web Service (Node) | `Web-app/marketing` | `https://formatx-marketing.onrender.com` |

---

## 1. Backend API (`formatx-api`)

**Runtime:** Python  
**Build Command:** `pip install -r requirements.txt`  
**Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`  

**Environment Variables (set in Render Dashboard):**
| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `OPENAI_API_KEY` | Your OpenAI API key (optional fallback) |
| `GOOGLE_REDIRECT_URI` | `https://formatx-app.onrender.com` |
| `FRONTEND_URL` | `https://formatx-app.onrender.com` |
| `DEMO_MODE` | `true` (or `false` when API quotas are available) |
| `GEMINI_MODEL` | `gemini-1.5-flash` |

---

## 2. Frontend App (`formatx-app`)

**Runtime:** Static Site  
**Build Command:** `npm install && npm run build`  
**Publish Directory:** `dist`  

**Environment Variables (set in Render Dashboard):**
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://formatx-api.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth client ID |

---

## 3. Marketing Site (`formatx-marketing`)

**Runtime:** Node  
**Build Command:** `npm install`  
**Start Command:** `node server.js`  

No secrets needed. The marketing site uses client-side JS to detect environment and set the correct app URL.

---

## Post-Deployment Steps

1. **Google Cloud Console:** Update your OAuth credentials:
   - **Authorized JavaScript Origins:** Add all 3 Render URLs
   - **Authorized Redirect URIs:** Add `https://formatx-app.onrender.com`

2. **Test the deployment:**
   - Marketing: `https://formatx-marketing.onrender.com`
   - App: `https://formatx-app.onrender.com`
   - API Health: `https://formatx-api.onrender.com/health`
   - API Docs: `https://formatx-api.onrender.com/docs`

---

## Manual Deploy (Without Blueprint)

If you prefer to create services manually:

### Backend
1. Click **"New"** → **"Web Service"**
2. Connect repo, set **Root Directory** to `Web-app/backend`
3. **Runtime:** Python
4. **Build:** `pip install -r requirements.txt`
5. **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from the table above

### Frontend
1. Click **"New"** → **"Static Site"**
2. Connect repo, set **Root Directory** to `Web-app/frontend`
3. **Build:** `npm install && npm run build`
4. **Publish Directory:** `dist`
5. Add rewrite rule: `/*` → `/index.html`
6. Add environment variables from the table above

### Marketing
1. Click **"New"** → **"Web Service"**
2. Connect repo, set **Root Directory** to `Web-app/marketing`
3. **Runtime:** Node
4. **Build:** `npm install`
5. **Start:** `node server.js`
