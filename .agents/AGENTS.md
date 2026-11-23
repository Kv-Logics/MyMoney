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

## 5. Mobile App & Mandatory Version Bumping Rule (CRITICAL)
- **Rule**: Every single update or APK release hereafter MUST increment the version number.
- **Why**: In-app GitHub release auto-updater (`AutoUpdateChecker.jsx`) and Settings compare the installed version against GitHub Releases (`/repos/Kv-Logics/MyMoney/releases/latest`). If the version is not bumped, existing users' devices will not recognize or download the update.
- **Required Version Steps for Every Update**:
  1. Increment version in `package.json` (e.g. `1.0.1` -> `1.0.2`).
  2. Increment `versionCode` (e.g. `2` -> `3`) and update `versionName` in `android/app/build.gradle`.
  3. Update `DEFAULT_FALLBACK_VERSION` in `src/components/AutoUpdateChecker.jsx`.
  4. Build & sync: `npm run build && npx cap sync android`.
  5. Compile release APK: `cd android && JAVA_HOME=/home/kv/jdk-21 ANDROID_HOME=/home/kv/Android/Sdk ./gradlew assembleRelease`.
  6. Copy APK to `release/MyMoney-v<VERSION>.apk`.
  7. Commit, push to `main`, and publish matching GitHub Release tag `v<VERSION>` with the APK asset.
  *(Or execute `python3 scripts/bump_version.py` which automates steps 1-3).*

