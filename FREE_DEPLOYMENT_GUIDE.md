# 🚀 100% Free Production Deployment Guide

Deploy the **AI-Based Visual Risk and Compliance Intelligence System** into production with **zero ongoing costs ($0.00/month)**.

---

## 🏗️ Architecture Overview

| Component | Platform | Free Tier Specifications | Role |
| :--- | :--- | :--- | :--- |
| **Database** | **Neon.tech** | Free Serverless PostgreSQL (0.5 GB, SSL included) | Persistent database storing users, logs, risk metrics, and chat history. |
| **Backend** | **Render.com** | Free Web Service (512 MB RAM, Python 3.12, Free SSL) | FastAPI REST API, Gemini AI assistant, ML forecasting, and analytics. |
| **Frontend** | **Vercel.com** | Free Hobby Tier (Global Edge CDN, Unlimited SSL) | React 19 + Vite SPA, responsive dark/light UI, interactive charts. |

---

## 📋 Step 1: Create Free Cloud Database on Neon.tech (1 Minute)

1. Go to [https://neon.tech](https://neon.tech) and click **Sign Up** (Sign in with your GitHub account).
2. Click **Create Project**:
   - **Project Name**: `risk-compliance-db`
   - **Postgres Version**: `16` (Default)
   - **Region**: Choose closest to you (e.g., `AWS US East (Ohio)` or `Frankfurt`).
3. Click **Create Project**.
4. In your project dashboard, find the **Connection Details** box:
   - Select **Connection string** (Direct or Pooled).
   - Copy the string. It will look like:
     ```text
     postgresql://neondb_owner:AbCd1234xYz@ep-cold-shadow-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   *(Keep this string copied for Step 2. You do **not** need to manually run any SQL scripts; our FastAPI backend automatically creates all tables and seeds the default schema upon first startup!)*

---

## 🐍 Step 2: Deploy Backend to Render.com (2 Minutes)

1. Ensure your latest code is pushed to your GitHub repository.
2. Go to [https://render.com](https://render.com) and click **Sign In** with GitHub.
3. In your Render Dashboard, click **New +** (top right) $\rightarrow$ **Web Service**.
4. Select **Build and deploy from a Git repository** $\rightarrow$ Click **Next**.
5. Connect your GitHub repository:
   - If prompted, authorize Render to access the repository.
   - Select your repo from the list.
6. Configure the Web Service settings:
   - **Name**: `visual-risk-backend` (or your preferred name)
   - **Region**: Select the same or closest region to your Neon DB (e.g. `Oregon (US West)` or `Ohio`).
   - **Branch**: `main` (or your active branch)
   - **Root Directory**: `userProfile/backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Select **Free** ($0/month).
7. Scroll down to **Environment Variables** $\rightarrow$ Click **Add Environment Variable**:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `ENV` | `production` | Enables production security flags |
   | `DATABASE_URL` | *(Paste your Neon connection string from Step 1)* | Auto-normalized to `postgresql+psycopg://` |
   | `GEMINI_API_KEY` | *(Paste your Google Gemini API key)* | Needed for AI Assistant & Simulation |
   | `GEMINI_MODEL` | `gemini-2.5-flash` | Ultra-fast, cost-free/generous quota model |
   | `DEV_AUTO_LOGIN` | `false` | Disables local dev mock auto-login |
   | `COOKIE_SECURE` | `true` | Enforces HTTPS-only secure cookies |
   | `COOKIE_SAMESITE` | `none` | Enables cross-origin cookies between Vercel & Render |
8. Click **Deploy Web Service**.
9. Wait ~2–3 minutes for the build and container deployment to complete.
10. Once the status shows **Live**, copy your live backend URL from the top of the page:
    - Example: `https://visual-risk-backend.onrender.com`

*(Test it by opening `https://visual-risk-backend.onrender.com/` in your browser. You should see `{"status":"healthy", "docs":"/docs"}`.)*

---

## ⚡ Step 3: Deploy Frontend to Vercel.com (1 Minute)

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Locate your GitHub repository and click **Import**.
4. Configure the Project:
   - **Project Name**: `visual-risk-intelligence` (or your preferred name)
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: Click **Edit** $\rightarrow$ Select `userProfile` $\rightarrow$ Click **Continue**.
   - **Build and Output Settings**: Defaults are pre-configured:
     - Build Command: `npm run build`
     - Output Directory: `dist`
5. Expand **Environment Variables**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://visual-risk-backend.onrender.com/api` *(use your actual Render URL from Step 2, including `/api`)* |
6. Click **Deploy**.
7. Vercel will build and deploy the React 19 application in under 45 seconds.
8. Click **Visit** to access your live production application! (e.g. `https://visual-risk-intelligence.vercel.app`).

---

## 🔒 Step 4: Optional CORS Polish on Render

Our backend automatically authorizes all `https://*.vercel.app` domains out of the box! 
If you want to explicitly pin your exact Vercel production domain:
1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Select your `visual-risk-backend` service $\rightarrow$ **Environment**.
3. Add or update:
   - `CORS_ORIGINS`: `https://visual-risk-intelligence.vercel.app` (replace with your exact Vercel URL)
4. Render will automatically redeploy with the updated setting.

---

## 🧪 Step 5: Verification & Production Health Check

1. Open your live Vercel URL in an **Incognito / Private Window**.
2. **Registration & Auth**:
   - Click **Sign Up** $\rightarrow$ Register a new test user account with email and password.
   - Verify you are redirected to the Dashboard seamlessly.
   - Inspect network headers: Notice that both the `Authorization: Bearer <token>` and `user_profiling_session` cookie are handled automatically.
3. **Core Features**:
   - **Dashboard**: Verify risk scores, monthly budget breakdown, and quick action metrics load from the cloud database.
   - **AI Risk & Compliance Assistant**: Send a question to the assistant (e.g. *"What should I do about my emergency fund?"*). Confirm streaming or response from Gemini.
   - **Future Simulation**: Adjust financial/habit sliders and click **Simulate Future**. Confirm modern AI predictions generate in layman's terms.
   - **Theme Switching**: Toggle between Dark and Light mode $\rightarrow$ verify all cards, navigation, and charts update smoothly.
4. **Page Refresh Test**:
   - Navigate to `/simulation` or `/ai-assistant` and press **F5 (Refresh)**.
   - Thanks to `vercel.json` SPA rewrites, the page will reload without 404 errors.

---

## 💡 Troubleshooting & Free Tier Tips

- **Render Free Tier Spin-Down**: Free Render web services go to sleep after 15 minutes of inactivity. When you make your first request after dormancy, it may take 30–45 seconds for Render to wake up. This is standard for free hosting. Once awake, subsequent requests are instantaneous.
- **Neon Cloud Postgres**: Neon automatically pauses compute after 5 minutes of zero traffic and resumes in under 500ms when a query arrives. Our backend's `pool_pre_ping=True` handles this transparently.
- **Google Gemini Quota**: The free tier of Gemini 2.5 Flash provides 15 Requests Per Minute (RPM) and 1,500 Requests Per Day (RPD) at $0 cost, which is more than enough for portfolios, demos, and personal projects.
