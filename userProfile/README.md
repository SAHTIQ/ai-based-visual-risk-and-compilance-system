# User Profile – Data Collection & User Profiling

This version connects the React frontend to the FastAPI + PostgreSQL backend for persistent data storage.

## Fixed in this version
- Frontend API paths now match the FastAPI routes.
- Browser requests include session cookies (`credentials: include`).
- The frontend automatically signs in to the seeded development account because this milestone has no login page yet.
- Removed fake local fallbacks for CRUD operations, so database/API failures are no longer hidden.
- Habits now persist category and frequency as well as name/status/duration/date.
- Added persistent user settings in PostgreSQL.
- Profile, financial, study, habit, activity, and settings endpoints are wired to the real backend.
- User creation/update now hashes passwords correctly.
- Pinned Passlib/bcrypt versions to avoid the previous bcrypt compatibility error.
- Existing `habit_records` tables receive the new category/frequency columns automatically on backend startup.
- Existing bundled development user with an old placeholder password hash is repaired automatically.

## Backend setup
From `backend`:

```powershell
.\\venv\\Scripts\\activate
pip install -r requirements.txt --upgrade
.\\venv\\Scripts\\uvicorn.exe app.main:app --reload --port 8000
```

Set your PostgreSQL connection in `backend/.env` if it differs from the default:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/user_profiling_db
```

The project includes `.env.example` as a template. Do not commit real database passwords.

## Frontend setup
From the project root:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Development account
The current milestone has no login UI. The frontend automatically authenticates the seeded account:

- Email: `alex.morgan@example.com`
- Password: `password123`

For a production system, replace this with a real login/registration flow.

## PostgreSQL tables
The application uses:
- `users`
- `user_profiles`
- `financial_records`
- `study_records`
- `habit_records`
- `activity_history`
- `user_settings`

After starting the backend, refresh pgAdmin and verify new records in the appropriate table.
