# MyMoney - Frontend Component System & State Management

## 1. Global State Management (`state` Object in `js/app.js`)

The application uses a centralized state object accessible across modules:

```javascript
const state = {
  token: getCookie('access_token') || '',
  refreshToken: getCookie('refresh_token') || '',
  user: null,
  activeOwner: null,          // Holds shared account owner info if viewing shared tracker
  expenses: [],
  categories: [],
  budgets: [],
  paymentMethods: [],
  savingsGoals: [],
  sharingList: [],
  sharedTrackers: [],
  notifications: [],
  auditLogs: [],
  tasks: [],
  settings: {
    currency: '₹',
    theme: 'dark',
    language: 'en',
    timezone: 'UTC'
  },
  syncQueue: [],             // Pending offline operations queued for back-end sync
  isOffline: false,
  currentTab: 'dashboard',   // Active view identifier
  receiptBase64: ''          // Holds base64 encoded receipt upload
};
```

---

## 2. Navigation & View Routing

- Controlled by `switchTab(tabId)` in `js/app.js`.
- Tab panes are `.tab-pane` containers in `index.html`.
- Supported tabs:
  - `dashboard`: Dynamic cards, chart visuals, budget gauges.
  - `expenses`: Full transaction ledger, multi-parameter filtering, bill upload, manual & voice modal entry.
  - `budgets`: Category & overall budget limit configuration, savings milestone goals.
  - `tasks`: Financial task list & itemized checklists with recurrence.
  - `reports`: Custom date range financial analytics & CSV exporter.
  - `sharing`: Family sharing invitations & active access lists.
  - `audit-log`: User action history.
  - `settings`: Currency, theme, API endpoint URL, password settings.

---

## 3. Date Formatting Convention

**Global Rule**: Standard formatting in the UI enforces `DD/MM/YYYY` via Flatpickr datepicker configuration, while sending standard `YYYY-MM-DD` string values to the MongoDB backend.

Helper utilities in `js/app.js`:
- `formatDateToDMY(dateStr)`: Converts `YYYY-MM-DD` -> `DD/MM/YYYY`.
- `setDateValue(inputId, dateStr)`: Safely updates DOM input and Flatpickr instance.
