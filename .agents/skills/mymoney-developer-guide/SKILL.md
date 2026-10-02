---
name: mymoney-developer-guide
description: Complete developer and future agent guide for running, building, testing, and debugging the MyMoney project.
---

# MyMoney Developer & Agent Skill Guide

This skill provides step-by-step instructions for future AI agents working on the MyMoney codebase.

## 1. Quick Verification Commands
Run these commands to verify system health before making changes:

```bash
# 1. Test Python Backend Syntax & Import Integrity
cd backend
PYTHONPATH=. venv/bin/python3 -c "from app.main import app; print('FastAPI loaded successfully with', len(app.routes), 'routes!')"

# 2. Check Backend Dependencies
venv/bin/pip list | grep -E "fastapi|pydantic|google-generativeai|pymongo"
```

## 2. Key Component Architecture
- **Voice AI Agent (`js/components/voice_agent.js`)**:
  - Manages Web Speech API recording, live transcript display, and prompt editing.
  - Sends text or voice transcripts to backend API endpoints (`/api/ai/parse-voice-chat`).
  - Supports custom user Gemini API key fallback saved in `localStorage.getItem('user_gemini_api_key')`.

- **LLM Extraction Service (`backend/app/services/llm_extractor.py`)**:
  - Utilizes Gemini 2.0 Flash (`gemini-2.0-flash`) as primary cascade model.
  - Parses voice/text narrations (e.g., "Ate dosa in the morning for 150 online, and biryani at night for 350 cash") into structured expense items with meal time tags (`morning`, `afternoon`, `night`, `snacks`).

- **Database Sanitization (`backend/app/database.py`)**:
  - Cleans `MONGODB_URI` of trailing newlines or whitespace.
  - Establishes connection pools for `users`, `expenses`, `budgets`, `categories`, `savings`, `tasks`, and `ai_usage` collections.

## 3. Troubleshooting Common Issues
- **Python 3.14 build errors**: Keep `pydantic>=2.10.0` in `backend/requirements.txt` to avoid binary wheel compilation failures.
- **WebSpeech `network` error**: Caused by browser ad-blockers, offline network status, or browser privacy settings blocking Google Speech STT service. Text input remains 100% functional.
