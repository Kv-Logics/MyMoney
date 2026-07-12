# 💸 MyMoney — Personal Expense Tracker

> A modern, full-stack personal finance tracker with multi-user sharing, budget alerts, savings goals, task management, admin controls, and real-time analytics — built by [Kv-Logics](https://github.com/Kv-Logics/MyMoney).

---

## 🚀 What Is This Project?

**MyMoney** is a sleek, glassmorphic expense tracking web application designed for personal and family-level financial management. It lets you log daily expenses, track budgets by category, set savings goals, manage tasks, share your tracker with family members, and view rich analytics — all from a single-page, responsive dashboard.

The app is fully self-contained: a **vanilla HTML/CSS/JS frontend** backed by a **FastAPI + MongoDB Atlas** REST API, deployable via Docker or cloud platforms.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, Tailwind CSS (CDN), Lucide Icons, Flatpickr |
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
- **DD/MM/YYYY date format** across the entire application (Flatpickr integration)

### 📊 Dashboard & Analytics
- **This Month's Spending** and **Today's Spending** summary cards (excluding Rent)
- **Dedicated Monthly Rent card** — rent expenses are isolated from all other metrics and displayed in their own tracker card
- **Animated donut pie chart** — category-wise spending breakdown with color legend
- **Weekly spending trend bar chart** with `< >` navigation to browse previous/future weeks, week total badge, and date range label
- Clickable day bars — click a day to filter Recent Transactions to that specific date
- **Recent Transactions** quick-view table on the dashboard
- Overall budget progress bar with color-coded alerts (green → amber → red)
- 4-column responsive summary grid (Month Spending, Today Spending, Monthly Rent, Remaining Budget)

### 🏠 Rent Isolation
- **Rent category is completely excluded** from Month Spending, Today Spending, Weekly Trend, Category Breakdown, Budget calculations, and Reports
- Rent expenses are displayed in a **dedicated "Monthly Rent" dashboard card**
- Keeps your discretionary spending metrics clean and accurate

### 🗂️ Budget Management
- Set monthly spending limits per category (Food, Fuel, Grocery, etc.) or an Overall limit
- Rent category is excluded from budget lists and Overall budget calculations
- Live progress bars per budget showing % used and status (Within Budget / Approaching Limit / Exceeded)
- **Automatic budget alert notifications** at 50%, 75%, 90%, and 100% thresholds

### 🎯 Savings Goals
- Create savings goals with a title and target amount
- Track current saved amount with a progress bar
- **Quick "Add Money" shortcut** directly on each goal card — no need to open the full edit form
- Completion badge (🎉) when a goal is reached
- Full edit and delete support

### ✅ Task Manager
- Create tasks with title, description, category, start/end dates, and notes
- Kanban-style task cards with checklist items
- Track task completion with progress indicators
- Full CRUD support with server-side persistence

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
- Viewable under the Audit Log tab
- Supports viewing audit logs for a shared tracker

### 📈 Reports
- Generate expense reports for any custom date range
- Summary: total spent, average expense, transaction count, highest/lowest spending category
- Rent category is excluded from report totals and exports
- **Export to CSV** — downloadable report file

### 🔐 Authentication
- Register and login with email + password
- Tokens stored in **secure HTTP cookies** (access token: 15 min, refresh token: 7 days)
- **Automatic token refresh** — transparent background refresh, no forced logouts
- Global fetch interceptor handles 401s and retries requests seamlessly
- **Immersive login loading screen** — animated floating orbs, live elapsed timer, and cycling status messages while waiting for server cold-start

### 👑 Admin Dashboard
- Dedicated admin view for the system administrator (gated by email)
- **System-wide stats**: Total Users, Total Expenses, Total Amount Tracked
- **User management table**: View all registered users with name, email, and currency
- **Credentials Control**: Upsert/reset passwords for any user directly from the dashboard
- Custom glassmorphic toast notifications for admin actions

### ⚙️ Settings
- Change currency display (INR, USD, EUR, GBP, etc.)
- Theme preference (dark/light) — selectable on login screen
- Timezone selection
- Configure custom API base URL (for self-hosting)

### 📱 Responsive Design
- **Collapsible left sidebar** on desktop, expandable on mobile
- Clean, dark glassmorphism design language with light theme support
- Sticky top header with sync status indicator
- Mobile-optimised layouts with responsive grid breakpoints

---

## 🗂️ Project Structure

```
MyMoney/
├── index.html                  # Single-page frontend app
├── css/
│   └── style.css               # Global styles, glassmorphism, animations
├── js/
│   ├── app.js                  # State, fetch interceptor, cookie helpers, toast, core logic
│   ├── api.js                  # API fetch calls (fetchUserData, fetchAllData, etc.)
│   ├── auth.js                 # Login, register, logout, token management, login loading
│   ├── ui.js                   # UI render functions (expenses, budgets, sharing, etc.)
│   └── components/
│       ├── dashboard.js        # Dashboard render logic (charts, stats, trends, admin)
│       ├── expenses.js         # Expense form handling and CRUD
│       ├── budgets.js          # Budget modal and form submissions
│       ├── savings.js          # Savings goal CRUD and quick-add
│       ├── tasks.js            # Task manager CRUD and rendering
│       ├── reports.js          # Report generation and CSV export
│       └── sharing.js          # Family sharing UI logic
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
│           ├── auth.py         # /api/auth/* — register, login, refresh, me, settings, admin
│           ├── expenses.py     # /api/expenses — CRUD + filters
│           ├── budgets.py      # /api/budgets — get & upsert budgets
│           ├── savings.py      # /api/savings — savings goals CRUD
│           ├── categories.py   # /api/categories — default + custom categories
│           ├── payment_methods.py  # /api/payment-methods
│           ├── sharing.py      # /api/sharing — invite, shared-with, shared-by, revoke
│           └── misc.py         # /api/analytics, /api/reports, /api/notifications, /api/audit-logs
├── robots.txt                  # SEO robots configuration
├── sitemap.xml                 # SEO sitemap
├── favicon.svg                 # App favicon
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

## 🔧 Development Log

| Area | What Was Done |
|---|---|
| **Auth** | Switched from localStorage tokens to secure cookies; added refresh token endpoint; global fetch interceptor for transparent token refresh |
| **Login UX** | Immersive loading screen with animated orbs, live timer, and cycling status messages during server cold-start |
| **Admin Dashboard** | Dedicated admin view with system stats, user management table, and password reset controls |
| **Rent Isolation** | Rent category fully excluded from all spending totals, budgets, trends, and reports; shown in dedicated card |
| **Weekly Trend** | Added `< >` week navigation, week total badge, and date range display |
| **Task Manager** | Full task CRUD with checklist items, categories, date ranges, and kanban-style cards |
| **Date Formatting** | DD/MM/YYYY format across the entire application using Flatpickr |
| **Toast Notifications** | Custom glassmorphic toast system replacing browser `alert()` calls |
| **Family Sharing** | Fixed shared tracker view (owner_email query fix); added clickable "Shared View" exit badge |
| **Notifications** | Bell dropdown auto-closes on outside click |
| **Responsive UI** | Collapsible sidebar on desktop/mobile; 4-column summary grid; responsive breakpoints |
| **Backend Refactor** | Split monolithic 984-line `main.py` into 8 focused `APIRouter` modules under `app/routers/`; added `utils.py` for shared helpers |
| **Frontend Refactor** | Split rendering into modular component files under `js/components/` |
| **API Detection** | Improved `API_BASE` detection to support LAN IPs (192.168.x, 10.x, 172.x) for local network access |
| **SEO** | Added `robots.txt`, `sitemap.xml`, meta tags, and semantic HTML structure |
| **Quick Add Money** | "Add Money" shortcut button directly on savings goal cards |

---

## 👨‍💻 Developed By

**[Kv-Logics](https://github.com/Kv-Logics)** — [github.com/Kv-Logics/MyMoney](https://github.com/Kv-Logics/MyMoney)
