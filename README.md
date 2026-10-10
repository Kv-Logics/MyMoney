# 💸 MyMoney — Agentic Financial Infrastructure & Personal Tracker

> A modern, full-stack personal finance platform equipped with **Streamable HTTP MCP (Model Context Protocol)**, **OAuth 2.1 PKCE Security**, **ChatGPT Custom Actions**, **Gemini 2.0 Flash Voice AI Agent**, multi-user sharing, budget alerts, and real-time analytics — built by **[Kv-Logics](https://github.com/Kv-Logics/MyMoney)**.

---

## 🌟 Modern Highlights & AI Agentic Architecture

MyMoney is an advanced financial management application bridging **traditional web applications** with **next-generation AI agents**. 

```text
ChatGPT / AI Clients                  Web & Mobile Frontend
        │                                      │
  OAuth 2.1 (PKCE S256)                   Vanilla JS SPA
  CIMD Discovery                          Web Speech & Gemini 2.0
        │                                      │
        ▼                                      ▼
Streamable HTTP MCP (/mcp) ──► FastAPI Backend Server ◄── REST APIs (/api/*)
                                      │
                         MongoDB Atlas (User Isolation)
```

### 🤖 1. Model Context Protocol (MCP) Server (`/mcp`)
- **Streamable HTTP Server**: Complies with RFC 9728 (Protected Resource Metadata) and RFC 8414 (Authorization Server Discovery).
- **9 Native MCP Tools**:
  - `get_user_profile` (`_meta["openai/profile"]: true`)
  - `list_expenses`, `create_expense`, `update_expense`, `delete_expense`
  - `get_expense_summary`, `list_budgets`, `create_or_update_budget`, `list_savings_goals`
- **Security & Scopes**: Every MCP tool explicitly declares its required scopes (`profile:read`, `expenses:read`, `expenses:write`, etc.) with `securitySchemes` and `_meta["mcp/www_authenticate"]` challenge mechanisms.

### 🔐 2. OAuth 2.1 (PKCE S256) & ChatGPT Account Linking
- **CIMD (Client ID Metadata Document)**: Built-in support for ChatGPT's identity (`https://chatgpt.com/oauth/client.json`) and stable redirect (`https://chatgpt.com/connector_platform_oauth_redirect`).
- **Resource Indicator Binding**: All access tokens explicitly bind `iss` and `aud` claims to `https://mymoney-jd0n.onrender.com`.
- **Per-User API Keys**: Generates cryptographically secure `mm_live_...` API keys (stored only as SHA-256 hashes in MongoDB) for direct REST integration.

### 🎙️ 3. Voice AI Agent (Gemini 2.0 Flash)
- **Multi-Turn Voice & Text Chat**: Speak naturally (e.g. *"I ate dosa in the morning for 150 online, and biryani at night for 350 cash"*) to automatically extract structured expense items.
- **Meal Duration & Time Parsing**: Maps spending to `morning`, `afternoon`, `night`, or `snacks`.
- **Manual Mic Control & Retained Prompts**: User controls recording start/stop with continuous transcript editing.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3 (Glassmorphism design system), Modular ES6 JS, Lucide Icons, Flatpickr |
| **Backend** | Python 3.14+, FastAPI, PyMongo, Uvicorn, PyJWT, Cryptography, Pydantic v2 |
| **AI Services** | Google Gemini 2.0 Flash (`google-generativeai`), Streamable HTTP MCP Protocol (`JSON-RPC 2.0`) |
| **Database** | MongoDB Atlas (Cloud) with single-tenant `user_id` query isolation |
| **Authentication** | OAuth 2.1 PKCE (S256), SHA-256 API Keys (`mm_live_...`), JWT Bearer Cookies |
| **Deployment** | Docker, Render (`https://mymoney-jd0n.onrender.com`), Vercel (`https://my-money-avv.vercel.app`) |

---

## ✨ Full Feature Overview

### 💰 Expense & Data Management
- **CRUD Operations**: Log, edit, and delete expenses with title, amount, category, payment method, date, time, location, description, and notes.
- **Advanced Filtering**: Filter by category, payment method, date range, amount bounds, and fuzzy search.
- **Rent Isolation**: Rent expenses are isolated in a dedicated card so discretionary spending metrics remain accurate.
- **DD/MM/YYYY Format**: Standardized date formatting across forms, tables, and date pickers.

### 📊 Dashboard & Visual Analytics
- **Parallel Data Hydration**: Concurrent data fetching for fast rendering.
- **Interactive Daily & Weekly Bar Graphs**: Week-by-week navigation (`< >`), week totals, and click-to-filter date bars.
- **Category Donut Charts**: Spending distribution per category with color legends.
- **Previous Period Comparison**: Quick badges for previous week and previous month spending trends.

### 🗂️ Budgets & Savings Goals
- **Category & Overall Budgets**: Set spending limits per category or overall monthly spending.
- **Threshold Alerts**: Automated notifications when spending reaches 50%, 75%, 90%, or 100% of limits.
- **Delete Budget Support**: Clear or update budget limits directly from the UI.
- **Savings Goals**: Track savings progress with quick "Add Money" shortcuts on goal cards.

### 👨‍👩‍👧 Family Sharing & Audit Logs
- **Multi-User Sharing**: Share read-only tracker access with family members via email.
- **One-Click View Switch**: Switch between your personal tracker and shared family trackers with an instant exit badge.
- **Activity Timeline**: Full audit logging for additions, edits, deletions, and sharing events.

### 📱 Daily Reminders & AI Web Push
- **Groq Llama 3 Summaries**: Instead of generic reminders, the app securely passes your day's expense summary to Groq's Llama 3 model, which replies with a concise, witty push notification.
- **Service Worker Native Push**: Utilizes the standard Web Push API and VAPID keys to send silent notifications directly to your desktop or mobile OS—without requiring an active browser tab or an email service.
- **How to Use Notification Feature**:
  1. Add your `GROQ_API_KEY` and `VAPID_PRIVATE_KEY` to your backend's (e.g., Render) environment variables.
  2. Log into the MyMoney web app, go to **Settings**, scroll to **DAILY REMINDERS (AI PUSH)**, and click **Enable Daily Reminders** to subscribe. Allow browser notifications.
  3. Schedule a nightly cron job to hit the `POST /api/push/send-daily-reminders` endpoint using your admin JWT, and your device will instantly receive a custom AI push notification summarizing your day!

---

## 📡 API Endpoints Overview

Here is a summary of all active features and endpoints available on the backend:

### 👤 Authentication & User Management
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
- `GET /api/auth/me`, `PUT /api/auth/settings`, `POST /api/auth/change-password`
- `GET /api/auth/api-key` - Retrieve the permanent API key for MCP plugins.

### 🤖 AI Agent & Tokens
- `GET /api/ai/access/status`, `POST /api/ai/access/request`
- `GET /api/ai/admin/dashboard` - Admin token analytics.
- `POST /api/ai/admin/users/{user_id}/status` - Approve/revoke AI access.

### 💰 Expenses & Receipts
- `GET /api/expenses`, `POST /api/expenses`, `PUT /api/expenses/{id}`, `DELETE /api/expenses/{id}`
- `POST /api/receipts/upload`, `POST /api/expenses/extract` (Gemini Vision)
- `POST /api/expenses/voice-agent` (Voice input to expense logs)

### 📈 Budgets, Savings & Daily Profits
- `GET /api/budgets`, `POST /api/budgets`, `DELETE /api/budgets/{id}`, `GET /api/budgets/category/{category}`
- `GET /api/savings`, `POST /api/savings`, `PUT /api/savings/{id}`, `DELETE /api/savings/{id}`
- `GET /api/profit`, `POST /api/profit`, `PUT /api/profit/{key}`, `DELETE /api/profit/{key}`, `GET /api/profit/summary`

### 📱 Daily Reminders & Web Push
- `POST /push/subscribe` - Register a device for push notifications.
- `POST /push/send-daily-reminders` - Admin endpoint to generate & send Llama 3 notifications.

### 🏢 Admin Global Controls & Telemetry
- `GET /api/auth/admin/users`, `GET /api/auth/admin/stats`
- `POST /api/auth/admin/set-password` - Force reset passwords.
- `GET /api/audit-logs` - View security logs.
- `POST /api/telemetry/wakeup` - Server cold-start metrics.

### 🗂️ Categories, Payment Methods & Multi-User Sharing
- `GET /api/categories`, `POST /api/categories`, `DELETE /api/categories/{id}`
- `GET /api/payment-methods`, `POST /api/payment-methods`
- `GET /api/sharing/shared-with`, `GET /api/sharing/shared-by`
- `POST /api/sharing/invite`, `DELETE /api/sharing/revoke/{id}`

### 📊 Analytics & Reporting
- `GET /api/analytics` - Dashboard charts data.
- `GET /api/reports`, `GET /api/reports/export` (CSV export)

### ✅ Task Manager
- `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`

### 🔌 External Integrations
- `GET /mcp` - MCP stream endpoint for ChatGPT/Claude.
- `GET /oauth/authorize`, `POST /oauth/token` - OAuth 2.0 PKCE Authorization.

---

## 🗂️ Project Directory Structure

```text
MyMoney/
├── .agents/                    # Workspace agent guidelines & developer skills
│   ├── AGENTS.md               # Workspace rules for AI assistants
│   └── skills/                 # Developer skill manuals
├── docs/                       # Technical architecture documents
│   ├── 01-ARCHITECTURE-OVERVIEW.md
│   ├── 02-BACKEND-API-AND-DATABASE-SCHEMA.md
│   ├── 03-FRONTEND-COMPONENT-SYSTEM.md
│   ├── 04-VOICE-AI-AGENT-SPECIFICATION.md
│   ├── 05-GEMINI-API-KEY-SETUP-GUIDE.md
│   ├── 06-AI-APPROVALS-AND-TOKEN-MONITORING.md
│   ├── 07-FUTURE-AGENT-DEVELOPMENT-AND-TROUBLESHOOTING.md
│   └── openapi-chatgpt.json    # OpenAPI 3.0.3 specification for ChatGPT Actions
├── index.html                  # Main SPA frontend
├── css/
│   └── style.css               # Glassmorphic design system
├── js/
│   ├── app.js                  # State management & fetch interceptors
│   ├── api.js                  # Hydration and parallel API calls
│   ├── auth.js                 # Authentication & login screen handlers
│   └── components/
│       ├── voice_agent.js      # Gemini 2.0 Flash Voice AI & AI Mode page
│       ├── dashboard.js        # Daily/weekly charts & summary cards
│       ├── expenses.js         # Expense CRUD logic
│       ├── budgets.js          # Budget limit modals & deletion
│       ├── savings.js          # Savings goal CRUD
│       ├── reports.js          # Custom report generator & CSV export
│       ├── tasks.js            # Task manager & checklist cards
│       └── sharing.js          # Family sharing controls
└── backend/
    ├── Dockerfile
    ├── requirements.txt        # Dependencies (Python 3.14 compatible)
    ├── tests/                  # Automated PyTest suite
    │   ├── test_api_key_auth.py
    │   └── test_mcp_oauth_full.py
    └── app/
        ├── main.py             # FastAPI entry point
        ├── auth.py             # JWT & API key verification
        ├── database.py         # MongoDB Atlas connection & URI cleaner
        ├── models.py           # Pydantic v2 schemas
        └── routers/
            ├── oauth.py        # RFC 9728, RFC 8414, PKCE S256, /oauth/*
            ├── mcp.py          # Streamable HTTP MCP server (/mcp)
            ├── auth.py         # /api/auth/* & /api/auth/api-key
            ├── expenses.py     # /api/expenses/*
            ├── budgets.py      # /api/budgets/*
            ├── savings.py      # /api/savings/*
            └── misc.py         # /api/analytics, /api/reports, etc.
```

---

## ⚙️ Local Development & Testing

### 1. Prerequisites
- Python 3.12 or 3.14+
- MongoDB Atlas database cluster

### 2. Environment Setup (`backend/.env`)
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?appName=mymoney
JWT_SECRET=your_super_secret_jwt_key
PORT=8000
```

### 3. Run Backend Locally
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Run Automated Test Suite
```bash
cd backend
PYTHONPATH=. venv/bin/pytest tests/test_api_key_auth.py tests/test_mcp_oauth_full.py -v
```

---

## 🌐 Production Deployments

| Component | Platform | Live URL / Endpoint |
|---|---|---|
| **Frontend** | Vercel | `https://my-money-avv.vercel.app` |
| **Backend REST API** | Render | `https://mymoney-jd0n.onrender.com/api` |
| **Streamable MCP Server** | Render | `https://mymoney-jd0n.onrender.com/mcp` |
| **Protected Resource Metadata** | Render | `https://mymoney-jd0n.onrender.com/.well-known/oauth-protected-resource` |
| **OAuth Authorization Server** | Render | `https://mymoney-jd0n.onrender.com/.well-known/oauth-authorization-server` |

---

## 👨‍💻 Developed By

**[Kv-Logics](https://github.com/Kv-Logics)** — [github.com/Kv-Logics/MyMoney](https://github.com/Kv-Logics/MyMoney)
