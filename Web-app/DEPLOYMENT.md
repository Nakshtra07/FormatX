# Deploying Amarika to Vercel

Since this project has multiple components (Marketing Site, Web App, Backend), the best way to deploy on Vercel is to create **three separate projects** from the same GitHub repository.

## Prerequisites
1.  Push this code to a GitHub repository.
2.  Log in to [Vercel](https://vercel.com).

---

## 1. Deploy the Backend (API)
*First, we need the API URL for the frontend to connect to.*

1.  Click **"Add New Project"** in Vercel.
2.  Import your repository.
3.  **Project Name:** `amarika-api` (example).
4.  **Framework Preset:** Select `Other`.
5.  **Root Directory:** Click "Edit" and select `backend`.
6.  **Environment Variables:** Add your secrets from `.env` here (e.g., `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.).
7.  Click **Deploy**.
8.  **Copy the Domain:** Once deployed, copy the URL (e.g., `https://amarika-api.vercel.app`). Note: You might need to add `/docs` to see Swagger UI, but the base URL is what we need.

---

## 2. Deploy the Web App (Frontend)
1.  Click **"Add New Project"**.
2.  Import the same repository.
3.  **Project Name:** `amarika-app`.
4.  **Framework Preset:** `Vite`.
5.  **Root Directory:** Click "Edit" and select `frontend`.
6.  **Environment Variables:**
    *   `VITE_API_URL`: Paste your Backend URL (e.g., `https://amarika-api.vercel.app`).
    *   `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
7.  Click **Deploy**.

---

## 3. Deploy the Marketing Site
1.  Click **"Add New Project"**.
2.  Import the same repository.
3.  **Project Name:** `amarika-marketing`.
4.  **Framework Preset:** `Other` (or just leave default, Vercel detects HTML).
5.  **Root Directory:** Click "Edit" and select `marketing`.
6.  Click **Deploy**.

---

## Final Steps
1.  Go to your **Web App** project settings and add your **Marketing Site Domain** to the CORS allowlist in your Backend if needed (though usually not strict for public GETs).
2.  Update your Google Cloud Console "Authorized JavaScript Origins" and "Redirect URIs" to match your new Vercel domains.

**Done!** You now have a production-ready setup with separate deployments for each component.
