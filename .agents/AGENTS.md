# MyMoney Workspace Rules & Agent Guidelines

## 1. Project Overview & Technology Stack
- **Frontend**: Pure HTML, CSS (Vanilla CSS design system), JavaScript (Vanilla JS modular components).
  - Main entry: `index.html`
  - JS modules: `js/api.js`, `js/app.js`, `js/ui.js`, `js/auth.js`, `js/wakeup.js`
  - Components: `js/components/voice_agent.js`, `js/components/dashboard.js`, `js/components/expenses.js`, `js/components/budgets.js`, `js/components/tasks.js`, `js/components/sharing.js`, `js/components/reports.js`, `js/components/savings.js`
- **Backend**: Python 3.12+ / 3.14 (FastAPI + PyMongo + Google Generative AI / Gemini 2.0).
  - Entry point: `backend/app/main.py`
  - Routers: `backend/app/routers/` (`auth.py`, `expenses.py`, `ai.py`, `budgets.py`, `categories.py`, `payment_methods.py`, `savings.py`, `sharing.py`, `tasks.py`, `misc.py`)
  - AI Services: `backend/app/services/llm_extractor.py`, `backend/app/services/ai_access.py`
  - Database: `backend/app/database.py` (MongoDB Atlas)

## 2. Environment Setup & Execution Guidelines
- **Backend Virtual Environment**: Always execute python commands using `PYTHONPATH=. venv/bin/python3` inside `backend/`.
- **Python 3.14 Compatibility**: `pydantic` MUST be `>=2.10.0` to avoid Rust `pyo3-ffi` compilation errors on Python 3.14 when building `pydantic-core`.
- **Database Connection**: `MONGODB_URI` is stored in `backend/.env`. String sanitization is implemented in `backend/app/database.py` to prevent newline injection and replica set write concern errors.
- **Starting Backend**:
  ```bash
  cd backend
  PYTHONPATH=. venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```

## 3. Web Speech & Voice AI Agent Notes
- Browser `webkitSpeechRecognition` relies on HTTPS and browser speech recognition endpoints (Google Web Speech API).
- If browser speech recognition fails with `Voice capture error: network`, users can still type their voice prompt/narration directly into the AI Mode chat input, which passes directly to Gemini 2.0 Flash (`/api/ai/parse-voice-chat` or `/api/ai/parse-voice`).

## 4. Documentation References
- Comprehensive architecture and design documents are located in the `docs/` folder:
  - `docs/01-ARCHITECTURE-OVERVIEW.md`
  - `docs/02-BACKEND-API-AND-DATABASE-SCHEMA.md`
  - `docs/03-FRONTEND-COMPONENT-SYSTEM.md`
  - `docs/04-VOICE-AI-AGENT-SPECIFICATION.md`
  - `docs/05-GEMINI-API-KEY-SETUP-GUIDE.md`
  - `docs/06-AI-APPROVALS-AND-TOKEN-MONITORING.md`
  - `docs/07-FUTURE-AGENT-DEVELOPMENT-AND-TROUBLESHOOTING.md`
