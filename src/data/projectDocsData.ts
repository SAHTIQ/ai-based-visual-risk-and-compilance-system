export interface DocSection {
  id: string;
  title: string;
  category: 'Overview' | 'System Design' | 'Core Architecture' | 'ML & AI' | 'Security & Testing' | 'Results & Highlights' | 'Appendices';
  content: string;
}

export const PROJECT_TITLE = "AI-BASED VISUAL RISK AND COMPILANCE SYSTEM";
export const PROJECT_SUBTITLE = "Project Documentation";
export const PROJECT_AUTHOR = "Mohammed Sahtiq S";

export const PROJECT_DOCS: DocSection[] = [
  {
    id: "abstract",
    title: "Abstract",
    category: "Overview",
    content: `The AI-Based Visual Risk and Compliance System is a full-stack application designed to collect, organize and analyze personal productivity, study, work-session, habit and financial records. The system combines a React/TypeScript frontend with a FastAPI backend, SQL-based persistent storage, classical machine-learning models, a deterministic what-if simulation engine, rule-based recommendations and an integrated AI assistant. The application is designed around user-specific historical data so that analytical outputs can be tied to recorded evidence rather than being presented as unsupported general statements.

The machine-learning component contains three trained models. Productivity and financial forecasting use Linear Regression, while habit consistency uses Logistic Regression. The training pipeline cleans data, selects application-compatible features, performs an 80/20 chronological split, trains the models and stores them as Joblib artifacts. The application loads these trained artifacts during inference and does not retrain models during normal API requests.

The simulation engine derives a baseline from a user's historical records and evaluates alternative conditions across configurable horizons including 30, 90, 180 and 365 days. It produces best, expected and risk scenarios, impact comparisons, sensitivity analysis, evidence metadata, rule traces and recommendations. The AI assistant uses application context such as productivity analytics, habits, study information, financial information, forecasts and simulation results to provide contextual responses. Persistent conversations, message history, streaming responses and user-specific context are supported.

The project also implements authentication, role handling, user-data isolation, API validation, CORS configuration, deployment configuration and automated tests for major backend components. Model evaluation results are documented transparently, including limitations where predictive performance is weaker.`
  },
  {
    id: "abbreviations",
    title: "List of Abbreviations",
    category: "Overview",
    content: `| Abbreviation | Meaning |
|---|---|
| AI | Artificial Intelligence |
| ML | Machine Learning |
| LLM | Large Language Model |
| API | Application Programming Interface |
| REST | Representational State Transfer |
| UI | User Interface |
| UX | User Experience |
| DB | Database |
| SQL | Structured Query Language |
| RAG | Retrieval-Augmented Generation |
| MAE | Mean Absolute Error |
| RMSE | Root Mean Squared Error |
| R² | Coefficient of Determination |
| F1 | F1 Score |
| CORS | Cross-Origin Resource Sharing |`
  },
  {
    id: "chapter-1",
    title: "Chapter 1 — Introduction",
    category: "Overview",
    content: `### 1.1 Introduction
Personal productivity depends on multiple interacting factors such as focused work time, distractions, study activity, habit consistency, financial behavior and routine patterns. Traditional productivity applications often display records or simple charts but do not connect historical behavior with forecasting, scenario analysis and contextual explanation. This project addresses that gap through a unified analytics application that stores personal records, derives measurable indicators and presents forecasts, simulations and AI-assisted explanations.

### 1.2 Project Background
The implemented application is a full-stack personal analytics platform. The backend is built with FastAPI and SQLAlchemy, while the frontend is implemented using a modern React/TypeScript stack. The backend exposes REST APIs for authentication, profiles, finance, study, habits, activity, analytics, forecasting, simulation and chat. Persistent data is stored through a relational database configuration, with PostgreSQL supported in deployment.

### 1.3 Problem Statement
Users may have productivity, study, habit and financial records in separate places, making it difficult to understand how their behavior changes over time. A useful system should transform these records into measurable indicators, identify historical patterns, provide evidence-based projections and allow the user to explore what may happen under different routine conditions.

### 1.4 Motivation
The motivation is to build a practical system in which analytics, machine learning, simulation and conversational AI operate on the user's application data. The project also emphasizes explainability by separating historical observations, model predictions and simulated scenarios.

### 1.5 Aim
To develop a personal productivity and lifestyle analytics system that combines structured user data, machine learning, scenario simulation and an AI assistant to provide contextual insights.

### 1.6 Objectives
1. Collect and manage user-specific productivity, work, study, habit and financial records.
2. Provide authenticated multi-user access (including password and Google OAuth).
3. Analyze historical records using deterministic analytics.
4. Train and use lightweight machine-learning models for selected forecasting tasks.
5. Provide evidence-based what-if simulations across multiple time horizons.
6. Generate explainable recommendations from rules and simulation results.
7. Provide a persistent conversational AI assistant using application context.
8. Validate important backend behavior using automated tests.

### 1.7 Scope
The current implementation covers personal data collection, authentication, analytics, forecasting, simulation, recommendations and conversational AI. It does not establish a general-purpose clinical, financial-advisory or diagnostic system. Predictions and scenarios are application-level analytical outputs and should be interpreted with the documented model limitations.

### 1.8 Target Users
The primary target is an individual user who wants to monitor productivity, habits, study/work activity and financial behavior. Administrative functionality is also present for controlled management and role-based access.

### 1.9 Proposed Solution
The proposed solution follows the pipeline:
**User records → Validation/Storage → Analytics → ML Forecasting → Simulation/Rules → Recommendation → AI Explanation → Frontend Visualization.**

### 1.10 Key Features
Authentication and profiles; multi-user data isolation; activity tracking; work sessions; study records; habits; financial records; analytics; ML forecasting; what-if simulation; sensitivity analysis; rule tracing; recommendations; persistent AI conversations; streaming assistant responses; and deployment configuration.

### 1.11 Project Workflow
The user authenticates, enters or generates records, and views analytical dashboards. Historical data is processed into application metrics. Forecasting uses saved ML models. Simulation uses historical baselines and deterministic scenario adjustments. The AI assistant retrieves relevant application context and uses an LLM to produce contextual responses.

### 1.12 Advantages
Centralized personal data; historical trend visibility; lightweight interpretable ML; configurable simulations; evidence metadata; persistent conversations; multi-user isolation; and modular backend services.

### 1.13 Limitations
The project uses relatively simple classical ML models and limited feature sets. Productivity predictive performance is modest (test R² = 0.146). Simulation outputs are scenario projections rather than guaranteed predictions. AI responses depend on the configured LLM service.

### 1.14 Future Scope
Future work may include richer time-series models, larger longitudinal datasets, improved causal analysis, more advanced retrieval, stronger model monitoring, mobile interfaces, real-time data integrations and broader evaluation.`
  },
  {
    id: "chapter-2",
    title: "Chapter 2 — Existing System and Proposed System",
    category: "Overview",
    content: `### 2.1 Existing System
Conventional productivity tools generally focus on manual logging, dashboards, reminders or isolated habit tracking. Such systems may not combine multiple behavioral domains into a single evidence-based analytical workflow.

### 2.2 Existing Workflow
A typical workflow is: user records activity → application stores the record → dashboard displays historical information. Forecasting and scenario reasoning may be limited or absent.

### 2.3 Problems
Data fragmentation, limited cross-domain analysis, limited forecasting, lack of what-if analysis, and limited contextual conversational assistance.

### 2.4 Need
A unified application is needed to connect structured records with measurable analytics and controlled predictive/AI functionality.

### 2.5 Proposed System
The proposed system stores multiple personal-data domains, derives analytics, uses trained ML artifacts for selected forecasts, provides scenario simulation and exposes a contextual AI assistant.

### 2.6 Proposed Workflow
\`\`\`
Input → Authentication → Data Storage → Analytics → ML Forecast / Simulation
  → Rule Evaluation → Recommendation → AI Explanation → Dashboard / Chat UI
\`\`\`

### 2.7 Comparison
The proposed system extends basic record tracking with predictive and scenario-oriented functionality while retaining transparent historical evidence.

### 2.8 Advantages
The architecture is modular, uses standard APIs, keeps ML training separate from inference, and provides explicit evidence and model evaluation metadata.`
  },
  {
    id: "chapter-3",
    title: "Chapter 3 — Requirement Analysis",
    category: "System Design",
    content: `### 3.1 Functional Requirements
- **FR1**: Registration and login (credentials and Google OAuth).
- **FR2**: Authenticated sessions (HTTP-only secure signed cookies & tokens).
- **FR3**: Profile management (name, email, age, gender, occupation, education, location, bio).
- **FR4**: Financial records (income, expenses, savings, budget, categories).
- **FR5**: Study records (courses, hours logged, target goals, performance).
- **FR6**: Habits (streaks, duration, frequencies, completion tracking).
- **FR7**: Work sessions/activity (coding, study, project, reading, deep work focus).
- **FR8**: Analytics (productivity scores, trendlines, activity heatmaps).
- **FR9**: Forecasts (machine-learning driven productivity, expense, and habit predictions).
- **FR10**: Simulations (what-if scenarios over 30, 90, 180, and 365 days).
- **FR11**: Recommendations (explainable rule-based and AI-driven guidance).
- **FR12**: Persistent conversations and chat messages.
- **FR13**: Streaming AI responses with server-sent events.
- **FR14**: Administrative/role controls (user/admin authorization).
- **FR15**: History management (activity logs and simulation history retention).

### 3.2 Non-Functional Requirements
Security, reliability, usability, maintainability, response performance, scalability, privacy, data isolation, explainability and recoverable error handling.

### 3.3 Hardware Requirements
Development computer capable of running Python 3.12+, Node.js 18+, a relational database (PostgreSQL/SQLite) and a modern browser. Production deployment runs in standard containerized cloud environments (Docker / Render / Vercel).

### 3.4 Software Requirements
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic, Alembic, Psycopg 3, pandas, NumPy, scikit-learn, Joblib, google-auth, OpenAI-compatible client.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, @react-oauth/google.

### 3.5 Development Environment
Source control through Git/GitHub, local Python virtual environment, npm package manager, FastAPI auto-generated OpenAPI/Swagger documentation, and Python unittest/pytest automated test framework.`
  },
  {
    id: "chapter-4",
    title: "Chapter 4 — System Design",
    category: "System Design",
    content: `### 4.1 Overview
The system uses a layered architecture: presentation layer, REST API layer, service layer, persistence layer, ML layer, simulation/recommendation layer and LLM integration layer.

### 4.2 High-Level Architecture
\`\`\`
[Frontend (React/TS)]
        │  (HTTP / JSON / Cookies)
        ▼
[FastAPI REST API Layer]
        │
  ┌─────┴──────────────────┬────────────────────────┐
  ▼                        ▼                        ▼
[Auth & Services]    [ML Inference]       [Simulation Engine]
  │  (SQLAlchemy)          │  (Joblib)              │
  ▼                        ▼                        │
[PostgreSQL Database] [Saved Models]                ▼
                                            [AI Assistant & LLM]
\`\`\`

### 4.3 Frontend Architecture
The frontend is responsible for routing (React Router v7), page rendering, cards, form handling, API communication with credentials, loading/error states and the conversational chat interface.

### 4.4 Backend Architecture
FastAPI routers separate domains: \`auth\`, \`users\`, \`profiles\`, \`financial\`, \`study\`, \`habits\`, \`activity\`, \`behavior\`, \`analytics\`, \`forecast\`, \`simulation\`, \`chat\`, \`settings\` and \`risk\`.

### 4.5 Database Architecture
SQLAlchemy models map application entities to relational tables. User IDs associate records strictly with their owners for total multi-user isolation.

### 4.6 ML Architecture
Training is isolated in \`backend/app/services/ml/train.py\`. Preprocessing is in \`preprocessing.py\`. Inference is handled by \`predict.py\`. Forecast orchestration is handled by \`ml_forecasting.py\`.

### 4.7 Simulation Architecture
The simulation service derives a baseline, receives what-if parameters, calculates scenario trajectories, evaluates rules, computes sensitivity and stores optional simulation history.

### 4.8 AI Assistant Architecture
Chat requests are persisted, relevant application context is prepared from user records, a structured system prompt is built, the LLM provider selects an appropriate model, and tokens are streamed to the client in real time.

### 4.9 Data Flow
Raw records → validation → relational storage → period aggregation → analytics/feature construction → ML or simulation → structured response → UI.

### 4.10 User Workflow
Register/login → complete profile → record activities/habits/study/finance → inspect dashboard → inspect forecast → run simulation → ask assistant questions.

### 4.11 Admin Workflow
Authenticated privileged users can access role-controlled functionality. Administrative behavior is guarded by role checks (\`role == "admin"\`).`
  },
  {
    id: "chapter-5",
    title: "Chapter 5 — System Modelling",
    category: "System Design",
    content: `### 5.1 Use Case Model
- **Primary Actor**: Authenticated User.
- **Privileged Actor**: Administrator.
- **External System**: AI LLM API (Qwen / OpenAI / Gemini).

### 5.2 User Use Cases
Register, login, logout, update profile, add records, view analytics, view forecasts, run simulations, inspect recommendations, create conversations, send chat messages and manage conversation history.

### 5.3 Admin Use Cases
Role-controlled administration, viewing system health, and managing users where enabled.

### 5.4 DFD Level 0 (Context Level)
\`\`\`
[User] ──(Credentials / Records / Queries)──> [Visual Risk & Compliance System]
[User] <──(Dashboards / Predictions / AI Chat)─ [Visual Risk & Compliance System]
\`\`\`

### 5.5 DFD Level 1
Separate sub-processes for:
1. Authentication & Session Issuance
2. Data Record Management (Finance, Study, Habits, Work)
3. Deterministic Analytics Engine
4. ML Forecasting (Loading Joblib artifacts)
5. What-If Simulation & Rule Engine
6. Conversational AI Assistant & Context Retrieval

### 5.6 Activity Model
Authentication → Dashboard → Data Retrieval → Analytics Generation → Visualization → Optional Forecast / Simulation / Chat Action.

### 5.7 Sequence: Authentication
Client sends credentials / Google token → Auth router validates → Session token generated → HTTP-only cookie set → Client receives user authentication payload.

### 5.8 Sequence: Dashboard
Client requests dashboard → Authenticated user resolved from session → User-scoped records queried → Analytics service aggregates records → Structured summary returned.

### 5.9 Sequence: ML Forecast
Forecast router → User records queried → Feature builder transforms to vectors → Saved Joblib model called → Prediction + evidence metadata returned.

### 5.10 Sequence: Simulation
Simulation request → Baseline derivation → Scenario generation → Impact / rule / sensitivity calculation → Recommendations + AI explanation generated → Response returned.

### 5.11 Sequence: Chatbot
User message → Conversation persisted → Context retrieved from user records → Prompt constructed → LLM provider routes stream → Streamed to client → Message saved.`
  },
  {
    id: "chapter-6",
    title: "Chapter 6 — Technology Stack",
    category: "Core Architecture",
    content: `### 6.1 Overview
The implementation uses a modern web stack with Python backend services, relational persistence, classical ML and LLM integration.

### 6.2 Frontend
- **React 19 & TypeScript**: Component-based UI with compile-time type safety.
- **Vite**: Ultra-fast module bundling and hot module replacement.
- **Tailwind CSS**: Utility-first responsive design supporting dark/light themes.
- **Lucide React**: Clean SVG iconography.
- **@react-oauth/google**: Google Identity Services integration.

### 6.3 Backend
- **FastAPI**: Modern, asynchronous Python web framework with automatic OpenAPI docs.
- **SQLAlchemy 2.0**: Typed Object-Relational Mapping (ORM).
- **Pydantic v2**: High-performance data validation and serialization.
- **Alembic**: Database migrations management.
- **bcrypt & itsdangerous**: Cryptographic password hashing and signed session serialization.

### 6.4 Database
PostgreSQL relational database with Psycopg 3 driver for ACID-compliant, persistent multi-user storage.

### 6.5 Machine Learning
- **scikit-learn**: LinearRegression and LogisticRegression models.
- **pandas & NumPy**: Tabular data manipulation and numerical vectorization.
- **Joblib**: Efficient serialization of trained model artifacts.

### 6.6 AI / LLM
- **UnifiedLLMService**: Custom client abstraction supporting OpenAI-compatible routers (Hugging Face router, Gemini API, OpenAI).
- **Default Models**: Qwen/Qwen3-Next-80B-A3B-Instruct (primary) and Qwen/Qwen2.5-7B-Instruct (fast).

### 6.7 API Documentation
FastAPI provides interactive Swagger UI at \`/docs\` and ReDoc at \`/redoc\`.

### 6.8 Deployment
Configured for automated deployment via Dockerfile and Render/Vercel configuration.`
  },
  {
    id: "chapter-7",
    title: "Chapter 7 — Database Design & Schema",
    category: "Core Architecture",
    content: `### 7.1 Overview
The database is organized around the authenticated user and domain-specific records. Every domain table references the \`users\` table via \`user_id\` as a foreign key with cascade deletion.

### 7.2 Entity Relationship Diagram (ERD)
\`\`\`
+--------------------+            +--------------------+
|       users        |            |   user_profiles    |
|--------------------|            |--------------------|
| PK  id             |1 ──────── 1| PK  id             |
|     email (UQ)     |            | FK  user_id (UQ)   |
|     name           |            |     age            |
|     password_hash  |            |     gender         |
|     role           |            |     occupation     |
|     user_key (UQ)  |            |     education      |
|     google_id (UQ) |            |     phone          |
|     created_at     |            |     location, bio  |
+--------------------+            +--------------------+
          │
          │ 1
          ▼ *
+─────────────────────────────────────────────────────────────+
│ Domain Tables (Scoped by user_id)                          │
├─────────────────┬─────────────────┬────────────────────────┤
│ financial_records│ study_records   │ habit_records          │
│ work_sessions   │ activity_history│ simulation_history     │
│ user_settings   │ risk_detections │ conversations          │
+─────────────────┴─────────────────┴────────────────────────+
                                                │ 1
                                                ▼ *
                                       +─────────────────────+
                                       |    chat_messages    |
                                       |---------------------|
                                       | PK id, FK conv_id   |
                                       | sender, content     |
                                       | metadata_json       |
                                       +─────────────────────+
\`\`\`

### 7.3 Main Tables
1. **users**: Primary user accounts (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`auth_provider\`, \`google_id\`, \`avatar_url\`).
2. **user_profiles**: User demographic information (\`age\`, \`gender\`, \`occupation\`, \`education\`, \`phone\`, \`location\`, \`bio\`).
3. **financial_records**: Financial tracking (\`income\`, \`expenses\`, \`savings\`, \`budget\`, \`category\`, \`goal\`, \`date\`).
4. **study_records**: Academic logs (\`subject\`, \`hours\`, \`goal_hours\`, \`performance\`, \`notes\`, \`date\`).
5. **habit_records**: Daily habit entries (\`habit_name\`, \`completed\`, \`duration_minutes\`, \`category\`, \`frequency\`, \`date\`).
6. **work_sessions**: Work and productivity logs (\`session_type\`, \`work_hours\`, \`focus_hours\`, \`productivity_score\`, \`date\`).
7. **simulation_history**: Stored what-if scenarios (\`scenario_name\`, \`horizon\`, \`baseline_json\`, \`inputs_json\`, \`results_json\`, \`impacts_json\`, \`rules_json\`, \`confidence\`, \`recommendation\`, \`ai_explanation\`).
8. **conversations**: Chat conversation threads (\`title\`, \`is_archived\`, \`pinned\`).
9. **chat_messages**: Individual messages (\`sender\`, \`content\`, \`metadata_json\`).`
  },
  {
    id: "chapter-10",
    title: "Chapter 10 — Machine Learning Pipeline",
    category: "ML & AI",
    content: `### 10.1 Objective
Machine Learning is used for focused, explainable forecasting tasks: productivity scores, next-period expenses, and habit consistency.

### 10.2 Training Workflow
\`\`\`
Raw CSV Datasets → Data Cleaning → Feature/Target Selection
  → Chronological 80/20 Split → Model Fitting → Held-out Evaluation → Joblib Storage
\`\`\`

### 10.3 Trained Models
1. **Productivity Model (Linear Regression)**:
   - **Features**: \`work_hours\`, \`focus_hours\`, \`distraction_hours\`, \`deep_work_sessions\`
   - **Target**: \`productivity_score\`
   - **Artifact**: \`productivity_model.joblib\`
2. **Financial Model (Linear Regression)**:
   - **Features**: \`weekly_income\`, \`savings\`, \`budget\`
   - **Target**: \`weekly_expenses\`
   - **Artifact**: \`financial_model.joblib\`
3. **Habit Model (Logistic Regression)**:
   - **Features**: \`routine_consistency\`
   - **Target**: \`good_habit_day\` (\`healthy_habit_score >= 95\`)
   - **Artifact**: \`habit_model.joblib\`

### 10.4 Evaluation Results (Held-Out Test Set)
| Model | Algorithm | Training Rows | Test Rows | Key Evaluation Metrics |
|---|---|---|---|---|
| Productivity | Linear Regression | 672 | 168 | MAE: 8.839, RMSE: 11.241, R²: 0.146 |
| Financial | Linear Regression | 672 | 168 | MAE: 195.798, RMSE: 255.998, R²: 0.819 |
| Habit | Logistic Regression | 672 | 168 | Accuracy: 0.726, Precision: 0.721, Recall: 1.000, F1: 0.838 |

### 10.5 Transparent Limitations
The productivity model reports a test R² of 0.146. It is transparently documented as a lightweight baseline rather than an overfitted black box. Model outputs are combined with actual historical evidence.`
  },
  {
    id: "chapter-12",
    title: "Chapter 12 — What-If Simulation Engine",
    category: "ML & AI",
    content: `### 12.1 Purpose
The simulation engine enables users to project alternative routine and financial conditions into future outcomes across configurable time horizons.

### 12.2 Historical Baseline
The engine derives an individualized baseline from actual records: average daily work hours, focus ratio, monthly spending, savings rate, study load, sleep duration, exercise frequency, and emergency runway.

### 12.3 What-If Inputs & Horizons
- **Adjustable Parameters**: Study load (hrs/wk), Sleep duration (hrs/night), Monthly spending, Exercise frequency (sessions/wk).
- **Supported Horizons**: 30 Days, 90 Days, 180 Days, and 365 Days.

### 12.4 Three Scenario Trajectories
1. **Optimistic (Best Case)**: Assumes high consistency, minimal distractions, and optimal compound savings.
2. **Expected Case**: Linear projection based on user's current baseline modulated by slider adjustments.
3. **Risk Case**: Models adverse conditions, unexpected expenses, or burnout effects.

### 12.5 Sensitivity Analysis & Rule Traces
- **One-at-a-time Sensitivity**: Identifies and ranks which parameter (Spending, Sleep, Study, or Exercise) has the highest leverage on projected outcomes.
- **Rule Tracing**: Transparently evaluates safety and compliance rules (e.g., Burnout Warning if sleep < 6 hrs and study > 25 hrs/wk; Financial Runway Warning if spending exceeds savings threshold).
- **Actionable Recommendations**: Produces deterministic recommendations with an AI-assisted narrative explanation.`
  },
  {
    id: "chapter-15",
    title: "Chapter 15 — AI Assistant / Personal Intelligence",
    category: "ML & AI",
    content: `### 15.1 Conversational Intelligence
The integrated AI assistant provides context-aware guidance grounded in user records rather than hallucinated responses.

### 15.2 Context Retrieval
When a user asks a question, the backend retrieves:
- Recent productivity analytics and work sessions.
- Habit consistency rates and streak metrics.
- Financial budget and expense summary.
- Active forecasting predictions and latest simulation results.

### 15.3 Model Routing & Streaming
- **Smart Model Routing**: Classifies queries into simple or complex. Complex analytical queries route to the primary model (\`Qwen/Qwen3-Next-80B-A3B-Instruct\`), while standard queries use the fast model.
- **Server-Sent Events (SSE)**: Responses are streamed token-by-token for responsive interaction.
- **Inline Evidence Cards**: Structured UI cards displaying KPIs, forecasts, or habits accompany relevant responses.`
  },
  {
    id: "chapter-8",
    title: "Chapter 8 — Security, Privacy & Secret Protection",
    category: "Security & Testing",
    content: `### 8.1 Secret Information & Credentials Management
All sensitive credentials, API keys, database connection strings, and cryptographic signing secrets are strictly isolated in server-side environment variables and are never committed to source control or exposed in client bundles. Runtime configuration is managed through validated environment settings with secure defaults.

### 8.2 Cryptographic Authentication & Password Protection
- **Bcrypt Salted Hashing**: User passwords are encrypted using adaptive bcrypt hashing with unique cryptographic salts. Passwords are never stored in plaintext.
- **Payload Guard**: UTF-8 byte length limits (maximum 72 bytes) prevent algorithmic complexity denial-of-service attacks during hashing.
- **Timing Attack Resistance**: Password verification uses constant-time string comparisons to eliminate timing-based side-channel leaks.

### 8.3 Multi-Tenant Isolation & Data Privacy
- **Strict User Scoping**: All database operations for finance, study, habits, work sessions, simulations, and chat history are explicitly scoped to the authenticated user's ID (\`user_id == current_user.id\`).
- **Authorization Guard**: Role-based access controls (RBAC) restrict administrative features to verified admin accounts.
- **Cascade Deletion**: When an account is terminated, foreign key cascade constraints systematically erase all associated personal records across all domain tables.

### 8.4 Session Integrity & OAuth 2.0 Security
- **HTTP-Only Cookies**: Authentication tokens are transmitted in HTTP-only, secure, SameSite cookies to protect against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).
- **Google OAuth Verification**: Google ID tokens undergo cryptographic signature verification against Google's official public keys before an account is authenticated or created.

### 8.5 Automated Security & Testing Verification
The system maintains comprehensive automated test coverage for authentication flows, password complexity enforcement, token tampering detection, tenant isolation, and profile update persistence.`
  },
  {
    id: "appendices",
    title: "Appendices A–C",
    category: "Appendices",
    content: `### Appendix A — Machine Learning Summary
- **Productivity**: Linear Regression (R² = 0.146, MAE = 8.84)
- **Financial**: Linear Regression (R² = 0.819, MAE = 195.80)
- **Habit**: Logistic Regression (Accuracy = 0.726, F1 = 0.838)

### Appendix B — Datasets
- \`user_time_features_10users_12weeks.csv\`
- \`user_time_finance_10users_12weeks.csv\`
- \`user_time_habit_10users_12weeks.csv\`
- \`user_time_management_10users_12weeks.csv\`
- \`user_time_productivity_10users_12weeks.csv\`
- \`user_time_study_10users_12weeks.csv\`
- \`user_time_wellbeing_10users_12weeks.csv\`

### Appendix C — Database Tables
\`users\`, \`user_profiles\`, \`user_settings\`, \`financial_records\`, \`study_records\`, \`habit_records\`, \`work_sessions\`, \`activity_history\`, \`simulation_history\`, \`conversations\`, \`chat_messages\`, \`risk_detections\`.`
  }
];
