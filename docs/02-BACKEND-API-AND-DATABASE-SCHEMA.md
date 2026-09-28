# MyMoney - Backend API & Database Schema

## 1. Database Collections Overview (MongoDB)

All documents use BSON `ObjectId` for `_id`, serialized into standard string `id` when returned over API.

### `users` Collection
```json
{
  "_id": ObjectId("..."),
  "name": "Keerthivasan",
  "email": "user@example.com",
  "password": "<bcrypt_hash>",
  "currency": "₹",
  "theme": "dark",
  "language": "en",
  "timezone": "UTC",
  "created_at": ISODate("...")
}
```

### `expenses` Collection
```json
{
  "_id": ObjectId("..."),
  "user_id": "<user_object_id_string>",
  "user_email": "user@example.com",
  "title": "Supermarket Shopping",
  "amount": 450.00,
  "category": "Grocery",
  "payment_method": "UPI",
  "date": "2026-09-28",
  "time": "14:30",
  "location": "Reliance Smart",
  "description": "Weekly grocery list items",
  "receipt_image": "data:image/png;base64,...",
  "notes": "",
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

### `budgets` Collection
```json
{
  "_id": ObjectId("..."),
  "user_id": "<user_object_id_string>",
  "category": "Food", // or "Overall"
  "amount": 5000.00,
  "created_at": ISODate("...")
}
```

### `tasks` Collection
```json
{
  "_id": ObjectId("..."),
  "user_id": "<user_object_id_string>",
  "title": "Pay Monthly Electricity Bill",
  "description": "TNEB bill payment",
  "checklist": [
    { "id": "1", "text": "Check meter reading", "completed": true, "due_date": "2026-09-29" },
    { "id": "2", "text": "Pay via GPay", "completed": false, "due_date": "2026-09-30" }
  ],
  "due_date": "2026-09-30",
  "due_time": "18:00",
  "priority": "high",
  "category": "Utilities",
  "status": "In Progress",
  "recurrence": "monthly",
  "progress": 50.0,
  "notes": "",
  "start_date": "2026-09-25",
  "created_at": ISODate("...")
}
```

---

## 2. API Endpoints Reference

### Auth Router (`/api/auth`)
- `POST /api/auth/register`: Register new user.
- `POST /api/auth/login`: Authenticate and receive JWT access & refresh tokens.
- `POST /api/auth/refresh`: Refresh expired JWT access token.
- `GET /api/auth/me`: Get current authenticated user profile.
- `PUT /api/auth/settings`: Update currency, theme, language, timezone.

### Expenses Router (`/api/expenses`)
- `GET /api/expenses`: Search, filter by category/date range/payment method/amount, and list expenses.
- `POST /api/expenses`: Add new expense document and run budget alert checks.
- `PUT /api/expenses/{id}`: Edit existing expense.
- `DELETE /api/expenses/{id}`: Delete expense by ID.
- `POST /api/expenses/extract`: Scan bill image using Gemini 1.5 Flash Vision.
- `POST /api/expenses/voice-agent`: Process voice/natural-language narration and return structured draft expenses for approval.

### Miscellaneous Router (`/api/...`)
- `GET /api/analytics`: Monthly spending summary, category/payment method breakdown, daily trend.
- `GET /api/reports`: Comprehensive financial report over date range.
- `GET /api/reports/export?format=csv`: Download CSV export of expenses.
- `GET /api/notifications`: Retrieve budget alerts and system alerts.
- `POST /api/notifications/read`: Mark all notifications as read.
- `GET /api/audit-logs`: Audit trail of user actions.
