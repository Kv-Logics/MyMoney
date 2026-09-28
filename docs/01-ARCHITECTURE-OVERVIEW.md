# MyMoney - System Architecture & Overview

## 1. Project Purpose & Summary
**MyMoney** is a real-time, shared personal finance tracker designed for individuals, families, and roommates. It provides expense tracking, category budgeting, savings goals, financial task checklists, shared read-only tracker access, dynamic analytics, audit logging, and automated receipt & voice AI parsing.

---

## 2. Technical Stack

| Layer | Technology | Key Details |
|---|---|---|
| **Frontend** | HTML5, JavaScript (Vanilla ES6), Tailwind CSS | Custom glassmorphism UI system (`css/style.css`), Web Speech API, Flatpickr date handling |
| **Backend** | Python 3.10+, FastAPI, Uvicorn | Async ASGI server, modular routers, JWT auth, Pydantic validation |
| **Database** | MongoDB | PyMongo / Motor client, collections: `users`, `expenses`, `categories`, `budgets`, `payment_methods`, `savings_goals`, `sharing`, `notifications`, `audit_logs`, `tasks` |
| **AI Integration** | Gemini API (`google.generativeai`) | Multimodal receipt OCR (`/api/expenses/extract`) & Voice Agent expense parsing (`/api/expenses/voice-agent`) |
| **Deployment** | Vercel (Frontend) / Render (Backend) | CORS configuration supporting cross-domain API calls |

---

## 3. Directory Structure

```
MyMoney/
├── index.html                   # Main single-page web application
├── css/
│   └── style.css                # Glassmorphism, animations & dark/light theme design system
├── js/
│   ├── app.js                   # State management, router, auth lifecycle, offline queue
│   ├── api.js                   # Data fetching, offline caching, background synchronization
│   ├── ui.js                    # Component renders & DOM event handlers
│   ├── wakeup.js                # Backend server cold-start ping & countdown overlay
│   └── components/
│       ├── dashboard.js         # Stat cards, category charts, spending trends
│       ├── expenses.js          # Expense list, filter forms, CRUD, receipt OCR
│       ├── budgets.js           # Budget limits & threshold alert checks
│       ├── savings.js           # Target goal progress tracking
│       ├── reports.js           # Date range analytics & CSV export
│       ├── sharing.js           # Family/roommate access control
│       ├── tasks.js             # Financial task & checklist management
│       └── voice_agent.js       # Voice AI narration parsing & interactive expense agent
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application initialization & middleware
│   │   ├── database.py          # MongoDB connection & collection accessor
│   │   ├── models.py            # Pydantic data schemas & request validation
│   │   ├── auth.py              # Password hashing (bcrypt) & JWT token validation
│   │   ├── utils.py             # Doc serializers, audit logger, sharing verifier
│   │   ├── services/
│   │   │   └── llm_extractor.py # Gemini LLM vision & natural language voice parser
│   │   └── routers/
│   │       ├── auth.py          # Registration, login, token refresh, user profile
│   │       ├── expenses.py      # Expense management & AI voice extraction endpoints
│   │       ├── categories.py    # Custom categories CRUD
│   │       ├── payment_methods.py# Payment options CRUD
│   │       ├── budgets.py       # Budget limits CRUD
│   │       ├── savings.py       # Savings goals CRUD
│   │       ├── sharing.py       # Shared viewing invitations
│   │       ├── tasks.py         # Financial tasks CRUD
│   │       └── misc.py          # Analytics, reports, notifications, audit logs
│   └── requirements.txt         # Python dependencies
└── docs/                        # Project Knowledge & Developer Documentation
```

---

## 4. Key Architectural Patterns

1. **Single-Page Application (SPA) with Tab State**:
   - Navigation is driven by `switchTab(tabId)` in `js/app.js`, dynamically toggling DOM elements without page reloads.
2. **Offline-First Capabilities**:
   - Network status monitor (`online`/`offline` listeners) queue actions into `state.syncQueue` stored in `localStorage`. Automatically syncs when connection returns.
3. **Budget Alert System**:
   - When expenses are added or updated, `check_budget_thresholds` in `backend/app/routers/expenses.py` calculates current month spending against category and overall budgets, triggering automated notifications at 50%, 75%, 90%, and 100% threshold limits.
4. **Shared Read-Only Access**:
   - Users can grant permission to other registered emails. Active shared viewing injects `owner_email` query params into API requests, enforcing read-only security in the backend.
