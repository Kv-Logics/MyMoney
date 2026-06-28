# 💸 MyMoney — Personal Expense Tracker

> A modern, full-stack personal finance tracker with multi-user sharing, budget alerts, savings goals, and real-time analytics — built by [Kv-Logics](https://github.com/Kv-Logics/MyMoney).

---

## 🚀 What Is This Project?

**MyMoney** is a sleek, dark-themed expense tracking web application designed for personal and family-level financial management. It lets you log daily expenses, track budgets by category, set savings goals, share your tracker with family members, and view rich analytics — all from a single-page, responsive dashboard.

The app is fully self-contained: a **vanilla HTML/CSS/JS frontend** backed by a **FastAPI + MongoDB Atlas** REST API, deployable via Docker or cloud platforms.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, Tailwind CSS (CDN), Lucide Icons |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Database** | MongoDB Atlas (cloud) |
| **Auth** | JWT (access + refresh tokens), stored in cookies |
| **Deployment** | Docker, Render (backend), Vercel (frontend) |
| **Password Hashing** | bcrypt |

---

## ✨ Features

### 💰 Expense Management
- Add, edit, and delete expenses with title, amount, category, payment method, date, time, location, description, and notes
- Rich filtering: by category, payment method, date range, amount range, and keyword search
- Sort expenses by date or amount (ascending/descending)
- Attach receipt images to expenses
- Offline mode with sync queue — expenses queued locally and synced when back online

### 📊 Dashboard & Analytics
- **This Month's Spending** and **Today's Spending** summary cards
- **Animated donut pie chart** — category-wise spending breakdown with color legend
- **7-day daily trend bar chart** — visual spending pattern over the last week
- **Recent Transactions** quick-view table on the dashboard
- Overall budget progress bar with color-coded alerts (green → amber → red)

### 🗂️ Budget Management
- Set monthly spending limits per category (Food, Rent, Fuel, etc.) or an Overall limit
- Live progress bars per budget showing % used and status (Within Budget / Approaching Limit / Exceeded)
- **Automatic budget alert notifications** at 50%, 75%, 90%, and 100% thresholds

### 🎯 Savings Goals
- Create savings goals with a title and target amount
- Track current saved amount with a progress bar
- **Quick "Add Money" shortcut** directly on each goal card — no need to open the full edit form
- Completion badge (🎉) when a goal is reached
- Full edit and delete support

### 🏷️ Categories
- 13 built-in default categories (Food, Rent, Grocery, Electricity, Fuel, Shopping, Entertainment, etc.)
- Create custom categories with custom name, color, and icon
- Delete custom categories

### 💳 Payment Methods
- 6 built-in defaults: Cash, UPI, Credit Card, Debit Card, Bank Transfer, Wallet
- Add your own custom payment methods

### 👨‍👩‍👧 Family / Multi-User Sharing
- Share your expense tracker with any registered user by email
- Shared users can view your dashboard, expenses, budgets, savings, and analytics in read-only mode
- **Family panel** in the sidebar — one-click switch between your tracker and a shared tracker
- **"Shared View [×]" badge** — click to instantly exit back to your own tracker
- Revoke access at any time from the Sharing settings tab
- Notifications sent to the invited user on new share

### 🔔 Notifications
- In-app notification bell with unread dot indicator
- Budget threshold alerts (category-level and overall)
- Sharing invite notifications
- Mark all as read
- Bell dropdown **auto-closes** when clicking anywhere else on the page

### 📋 Audit Logs
- Full activity timeline: every expense added, edited, or deleted; every sharing invite sent or revoked; every goal created or updated
- Viewable under the Settings tab
- Supports viewing audit logs for a shared tracker

### 📈 Reports
- Generate expense reports for any custom date range
- Summary: total spent, average expense, transaction count, highest/lowest spending category
- **Export to CSV** — downloadable report file

### 🔐 Authentication
- Register and login with email + password
- Tokens stored in **secure HTTP cookies** (access token: 15 min, refresh token: 7 days)
- **Automatic token refresh** — transparent background refresh, no forced logouts
- Global fetch interceptor handles 401s and retries requests seamlessly

### ⚙️ Settings
- Change currency display (INR, USD, EUR, GBP, etc.)
- Theme preference (dark/light)
- Timezone selection
- Configure custom API base URL (for self-hosting)

### 📱 Responsive Design
- **Static left sidebar** on desktop
- Clean, dark glassmorphism design language
- Sticky top header with sync status indicator
- Mobile-optimised layouts

---

## 🗂️ Project Structure

```
MyMoney/
├── index.html                  # Single-page frontend app
├── css/
│   └── styles.css              # Global styles & glassmorphism
├── js/
│   ├── app.js                  # State, fetch interceptor, cookie helpers, core logic
│   ├── api.js                  # API fetch calls (fetchUserData, fetchAllData, etc.)
│   ├── auth.js                 # Login, register, logout, token management
│   ├── ui.js                   # UI render functions (expenses, budgets, sharing, etc.)
│   └── components/
│       └── dashboard.js        # Dashboard-specific render logic (charts, stats, trends)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app entry — mounts all routers
│       ├── auth.py             # JWT creation, verification, get_current_user
│       ├── database.py         # MongoDB Atlas connection
│       ├── models.py           # Pydantic schemas
│       ├── utils.py            # serialize_doc, log_audit_action, verify_sharing_access
│       └── routers/
│           ├── auth.py         # /api/auth/* — register, login, refresh, me, settings
│           ├── expenses.py     # /api/expenses — CRUD + filters
│           ├── budgets.py      # /api/budgets — get & upsert budgets
│           ├── savings.py      # /api/savings — savings goals CRUD
│           ├── categories.py   # /api/categories — default + custom categories
│           ├── payment_methods.py  # /api/payment-methods
│           ├── sharing.py      # /api/sharing — invite, shared-with, shared-by, revoke
│           └── misc.py         # /api/analytics, /api/reports, /api/notifications, /api/audit-logs
└── vercel.json                 # Frontend deployment config
```

---

## ⚙️ Setup & Running

### Prerequisites
- Python 3.11+
- MongoDB Atlas cluster (free tier works)
- A `.env` file in `backend/`

### Backend `.env`
```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mymoney
JWT_SECRET=your_secret_key_here
```

### Run Locally

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open `index.html` directly in your browser — the frontend auto-detects localhost and points to `http://localhost:8000/api`.

### Run with Docker

```bash
cd backend
docker build -t mymoney-backend .
docker run -p 8000:8000 --env-file .env mymoney-backend
```

---

## 🌐 Deployment

| Part | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | Deploy root folder; `vercel.json` rewrites all routes to `index.html` |
| Backend | **Render** | Deploy `backend/` with Docker; set env vars in Render dashboard |

---

## 🔧 What We Built / Changed (Development Log)

| Area | What Was Done |
|---|---|
| **Auth** | Switched from localStorage tokens to secure cookies; added refresh token endpoint; global fetch interceptor for transparent token refresh |
| **Family Sharing** | Fixed shared tracker view (owner_email query fix); added clickable "Shared View" exit badge |
| **Notifications** | Bell dropdown auto-closes on outside click |
| **Responsive UI** | Sidebar made static on desktop; mobile-friendly layouts |
| **Backend Refactor** | Split monolithic 984-line `main.py` into 8 focused `APIRouter` modules under `app/routers/`; added `utils.py` for shared helpers |
| **Frontend Refactor** | Split `renderDashboard()` into `js/components/dashboard.js`; modular script loading |
| **Sidebar** | Made permanently static (no mobile drawer toggle) |
| **API Detection** | Improved `API_BASE` detection to support LAN IPs (192.168.x, 10.x, 172.x) for local network access |
| **Quick Add Money** | "Add Money" shortcut button directly on savings goal cards |
| **Bug Fix** | Removed duplicate `const API_BASE` declaration between `app.js` and `api.js` |
| **Footer** | Added "Developed by Kv-Logics" attribution with GitHub repo link |

---

## 👨‍💻 Developed By

**[Kv-Logics](https://github.com/Kv-Logics)** — [github.com/Kv-Logics/MyMoney](https://github.com/Kv-Logics/MyMoney)
