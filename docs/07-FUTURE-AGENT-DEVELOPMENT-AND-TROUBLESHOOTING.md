# 07 - Future Agent Development & Troubleshooting Guide

## Executive Summary
This document serves as an actionable guide for future AI agents and developers building upon the **MyMoney** platform. It consolidates findings from recent `git pull` analysis, dependency fixes, browser Web Speech fallback handling, and backend service verification.

---

## 1. Environment & Backend Diagnostics

### A. Python 3.14 Compatibility Fix
* **Issue Encountered**: On Python 3.14 environments, `pydantic==2.7.1` attempted to build `pydantic-core v2.18.2` from source, failing due to breaking changes in Python 3.14's `ForwardRef._evaluate()`.
* **Resolution**: Updated `backend/requirements.txt` to `pydantic>=2.10.0` and upgraded virtual environment dependencies.
* **Verification Command**:
  ```bash
  cd backend
  PYTHONPATH=. venv/bin/python3 -c "from app.main import app; print('App loaded successfully! Routes count:', len(app.routes))"
  ```

### B. Database Connection Hygiene
* **Issue Encountered**: `MONGODB_URI` environment strings containing unescaped trailing newlines caused MongoDB Atlas replica set write concern exceptions.
* **Resolution**: Implemented URI string sanitization in `backend/app/database.py` via `MONGODB_URI.strip()`.

---

## 2. Voice AI Agent & Web Speech Troubleshooting

### A. Browser `Voice capture error: network`
* **Root Cause**: The Web Speech API (`webkitSpeechRecognition`) streams raw audio to Google's cloud Speech-to-Text servers. A `network` error is thrown by Chrome/Brave if:
  1. Brave Shields or browser extension ad-blockers intercept the Speech API websocket connection.
  2. Microphone permissions are blocked or network connectivity drops temporarily.
* **Fallback Behavior**:
  * The frontend UI ([js/components/voice_agent.js](file:///home/kv/Projects/MyMoney/js/components/voice_agent.js)) allows users to type narrations directly into the chat prompt box.
  * Clicking **Send** dispatches the text prompt directly to the FastAPI backend (`/api/ai/parse-voice-chat`), bypassing browser Speech-to-Text entirely while invoking Gemini 2.0 Flash to extract structured draft expenses.

---

## 3. Recommended Future Agent Action Items

1. **Backend Integration**:
   * Migrate `google.generativeai` package calls to the updated `google.genai` SDK in `backend/app/services/llm_extractor.py` to clear deprecation warnings.
2. **Frontend UI Resilience**:
   * Add a visual fallback indicator next to the microphone icon when WebSpeech fails, prompting the user: *"Speech recognition unavailable over current connection — type your narration below!"*
3. **Data Hydration Optimization**:
   * Maintain the parallelized data fetching in `js/api.js` (`Promise.allSettled`) for fast dashboard initial rendering.

---

## 4. Documentation Index
* [01-ARCHITECTURE-OVERVIEW.md](file:///home/kv/Projects/MyMoney/docs/01-ARCHITECTURE-OVERVIEW.md)
* [02-BACKEND-API-AND-DATABASE-SCHEMA.md](file:///home/kv/Projects/MyMoney/docs/02-BACKEND-API-AND-DATABASE-SCHEMA.md)
* [03-FRONTEND-COMPONENT-SYSTEM.md](file:///home/kv/Projects/MyMoney/docs/03-FRONTEND-COMPONENT-SYSTEM.md)
* [04-VOICE-AI-AGENT-SPECIFICATION.md](file:///home/kv/Projects/MyMoney/docs/04-VOICE-AI-AGENT-SPECIFICATION.md)
* [05-GEMINI-API-KEY-SETUP-GUIDE.md](file:///home/kv/Projects/MyMoney/docs/05-GEMINI-API-KEY-SETUP-GUIDE.md)
* [06-AI-APPROVALS-AND-TOKEN-MONITORING.md](file:///home/kv/Projects/MyMoney/docs/06-AI-APPROVALS-AND-TOKEN-MONITORING.md)
* [07-FUTURE-AGENT-DEVELOPMENT-AND-TROUBLESHOOTING.md](file:///home/kv/Projects/MyMoney/docs/07-FUTURE-AGENT-DEVELOPMENT-AND-TROUBLESHOOTING.md)
