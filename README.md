# 🛡️ AI-Based Visual Risk and Compliance Intelligence System

An end-to-end full-stack intelligence platform that monitors financial risk, daily study habits, and productivity patterns using machine learning forecasting, visual risk analytics, and an integrated Google Gemini AI Assistant.

---

## 📁 Repository Structure

```text
ai-based-visual-risk-and-compilance-system/
├── backend/                  # FastAPI REST API, Gemini AI assistant, ML models & tests
│   ├── app/                  # Application core, routers, models, schemas, and services
│   ├── tests/                # Comprehensive unit and integration test suite
│   ├── alembic/              # Database migration configurations
│   ├── requirements.txt      # Python dependencies (FastAPI, SQLAlchemy, Scikit-learn, OpenAI/Gemini)
│   └── Dockerfile            # Container configuration for backend service
├── src/                      # React 19 + TypeScript + Vite frontend
│   ├── components/           # Reusable UI widgets, visual risk cards, charts, and modals
│   ├── context/              # Authentication and App state management
│   ├── pages/                # Dashboard, Risk Assistant, Simulation, Habits, Profile
│   └── services/api.ts       # Dynamic API client with Bearer auth & cookies
├── public/                   # Static assets, icons, and SVG graphics
├── datasets/                 # Synthetic 12-week profiling datasets
├── deploy/                   # Docker Compose and Caddy reverse proxy orchestration
├── .gitignore                # Comprehensive Git ignore rules (protects .env, venvs, node_modules)
├── package.json              # Frontend dependencies and Vite build scripts
├── vite.config.ts            # Vite configuration
├── vercel.json               # Vercel Single-Page Application (SPA) routing rewrites
├── render.yaml               # Render Web Service blueprint configuration
└── FREE_DEPLOYMENT_GUIDE.md  # Step-by-step 100% free deployment guide (Vercel + Render + Neon)
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup (FastAPI + Python 3.12)

From the repository root:

```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```
cd D:\userProfile_simple_ml
.\.venv\Scripts\Activate.ps1
cd .\backend
python -m uvicorn app.main:app --reload --port 8000
```

> **Database Configuration**:
> Configure your PostgreSQL connection in `backend/.env` (see `.env.example`):
>
> ```env
> DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/user_profiling_db
> GEMINI_API_KEY=your-gemini-api-key
> ```

FastAPI will start at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).

---

### 2. Frontend Setup (React 19 + Vite)

From the repository root:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

* **Frontend Production Build**:

  ```powershell
  npm run build
  ```
* **Backend Unit & Integration Tests**:

  ```powershell
  cd backend
  python -m unittest discover tests
  ```

---

## 🌐 100% Free Production Deployment

This project is configured for one-click free production deployment:

* **Database**: [Neon.tech](https://neon.tech) (Free Serverless PostgreSQL 16)
* **Backend**: [Render.com](https://render.com) (Free Python 3.12 Web Service)
* **Frontend**: [Vercel.com](https://vercel.com) (Free Global Edge CDN)

👉 Follow the complete step-by-step instructions in [**`FREE_DEPLOYMENT_GUIDE.md`**](FREE_DEPLOYMENT_GUIDE.md).

---

## 📜 License

This project is licensed under the **MIT License**.

Copyright (c) 2026 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
