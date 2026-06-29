# SummarizeAI

A web app for automatic text summarization. Built as a final-year project using Python, FastAPI, and React.

---

## Prerequisites

Install these before anything else:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.11 or 3.12 | https://www.python.org/downloads/ |
| Node.js | 18 or 20 | https://nodejs.org/ |
| PostgreSQL | 14, 15, or 16 | https://www.postgresql.org/download/windows/ |

> **Windows tip:** When installing PostgreSQL, note the password you set for the `postgres` user. You will need it in step 1.

---

## Project Structure

```
summarize-ai/
├── backend/          ← Python FastAPI server
│   ├── app.py        ← ENTRY POINT  →  python app.py
│   ├── .env          ← your local config (edit this)
│   ├── requirements.txt
│   └── app/
│       ├── api/      ← REST endpoints
│       ├── models/   ← database tables
│       ├── services/ ← business logic + NLP engine
│       └── ...
└── frontend/         ← React + Vite
    ├── src/
    └── package.json
```

---

## Setup

### 1. Configure the backend

Open `backend/.env` and update the database line with your PostgreSQL password:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/summarize_ai
```

Everything else in `.env` can stay as-is for local development.

---

### 2. Create the PostgreSQL database

Open **pgAdmin** (installed with PostgreSQL) or **psql** and run:

```sql
CREATE DATABASE summarize_ai;
```

Or from the Windows command prompt (if psql is on your PATH):

```cmd
psql -U postgres -c "CREATE DATABASE summarize_ai;"
```

---

### 3. Install backend dependencies

Open a terminal in the `backend` folder:

```cmd
cd summarize-ai\backend
pip install -r requirements.txt
```

> If you see errors about Visual C++ or build tools, install the
> [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
> then re-run the pip command.

---

### 4. Run the backend

```cmd
python app.py
```

On first run this will:
- Connect to PostgreSQL
- Download NLTK language data
- Create all database tables
- Seed the admin account
- Start the API server at http://localhost:8000

You should see:

```
[SummarizeAI] ✓ Configuration loaded
[SummarizeAI] ✓ PostgreSQL connected  →  localhost:5432/summarize_ai
[SummarizeAI] ✓ NLTK data ready
[SummarizeAI] ✓ Database schema up to date
[SummarizeAI] ✓ Admin account and default settings ready

   ============================================================
   SummarizeAI API  [DEVELOPMENT]
   ============================================================
   API Base  :  http://localhost:8000/api/v1
   Swagger UI:  http://localhost:8000/api/docs
   Admin     :  admin@summarizeai.com   password: Admin@123456
   Frontend  :  cd ../frontend  &&  npm run dev
   ============================================================
```

> Keep this terminal open while using the app.

---

### 5. Install frontend dependencies

Open a **second terminal** in the `frontend` folder:

```cmd
cd summarize-ai\frontend
npm install
```

---

### 6. Run the frontend

```cmd
npm run dev
```

You will see:

```
  VITE v5.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@summarizeai.com | Admin@123456 |

Register new accounts through the sign-up page.

---

## Troubleshooting

### `SECRET_KEY is not configured`
Your `.env` file is not being read. Make sure:
- The file is named exactly `.env` (not `.env.txt`)
- It is inside the `backend` folder, next to `app.py`
- You are running `python app.py` from inside the `backend` folder

### `Cannot reach PostgreSQL`
- Open pgAdmin and make sure the PostgreSQL service is running
- Check that the password in `DATABASE_URL` matches your postgres user password
- Make sure the `summarize_ai` database was created

### `pip install` fails with build errors
Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and try again, or use:
```cmd
pip install --only-binary :all: -r requirements.txt
```

### Port 8000 already in use
Another process is using port 8000. Either stop it, or change the port in `.env`:
```env
APP_PORT=8001
```
Then also update the frontend proxy in `frontend/vite.config.ts` to match.

### Port 5173 already in use
Vite will automatically try the next port (5174, 5175, etc.) and show the actual URL.

### NLTK download fails (no internet)
Download the data files manually:
1. Open Python: `python`
2. Run:
```python
import nltk
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('stopwords')
```

---

## Running Both Servers at Once (Windows)

Create a file `start.bat` in the `summarize-ai` folder:

```bat
@echo off
echo Starting SummarizeAI...

start "Backend" cmd /k "cd backend && python app.py"
timeout /t 5 /nobreak > nul
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers started.
echo Backend:  http://localhost:8000/api/docs
echo Frontend: http://localhost:5173
```

Double-click `start.bat` to launch both servers in separate windows.

---

## API Documentation

The interactive API docs are available while the backend is running:

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

### Key Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login, get JWT tokens |
| POST | `/api/v1/summaries/` | Summarize text |
| POST | `/api/v1/summaries/upload` | Summarize uploaded file |
| GET  | `/api/v1/summaries/` | List your summaries |
| GET  | `/api/v1/summaries/{id}/export?format=pdf` | Export summary |
| GET  | `/api/v1/admin/analytics` | Platform analytics (admin only) |

---

## NLP Algorithms

| Algorithm | Best For |
|-----------|----------|
| **TF-IDF** | Technical documents, reports |
| **LSA** | Academic papers, semantic analysis |
| **LexRank** | News articles, general text |
| **Luhn** | Short, focused documents |

---

## Tech Stack

Backend: Python 3.11, FastAPI, SQLAlchemy, PostgreSQL, NLTK, Scikit-learn, Sumy, JWT

Frontend: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Query, Zustand

---

## Features

- 4 extractive NLP summarization algorithms
- Upload TXT, PDF, DOCX files up to 10 MB
- Export summaries as PDF, DOCX, or TXT
- User dashboard with real statistics
- Full summary history with search and pagination
- Admin panel: user management, analytics, logs, settings
- JWT authentication with refresh tokens
- Role-based access control (user / admin)
