# MyMoney - AI Access Approval & Token Quota Monitoring

## 1. Overview & Purpose
To prevent uncontrolled token consumption and preserve Gemini API credits on public/shared deployments, **Agentic MyMoney** implements an **Admin Approval & Token Monitoring System**.

### Primary Administrator
- **Admin Email**: `keerthivasan.220722@gmail.com` (with secondary alias `a.keerthivasan7676@gmail.com`)
- Admin accounts automatically have permanent, unrestricted access to the Voice AI Agent and receipt scanning, and control permissions for all other users.

---

## 2. User Access & Approval Lifecycle

1. **New / Unapproved User**:
   - When an unapproved user opens the Voice AI Agent, they see a clean **"Approval Required"** screen.
   - The user clicks **"Request AI Access from Admin"**, which submits an entry to the `ai_access` MongoDB collection with status `pending`.
2. **Admin Review**:
   - The admin opens the Dashboard or Settings panel.
   - The **"AI Voice Agent & Token Monitoring"** card shows:
     - Real-time pending requests count badge.
     - Total AI calls and estimated token consumption across the system.
     - Table of all registered users with one-click **"Approve"** and **"Revoke"** action buttons.
3. **Approved User**:
   - Once approved, the Voice Agent modal unlocks voice recording, chat narration, draft expense cards, and bulk saving.

---

## 3. Gemini API Key Configuration (Zero Keys in Git)

To maintain absolute repository security:
- **No API keys are committed to Git or hardcoded in source code.**
- Users or administrators can paste their Gemini API key directly into the **"Gemini Key"** field in the Voice Agent modal or Settings.
- The key is saved locally in the browser's `localStorage` (`gemini_api_key`) and passed dynamically per session.
- Alternatively, the server environment variable `GEMINI_API_KEY` can be used.

---

## 4. API Reference

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/ai/access/status` | `GET` | User | Get current user's AI access permission & token usage |
| `/api/ai/access/request` | `POST` | User | Submit AI feature access request to admin |
| `/api/ai/admin/dashboard` | `GET` | Admin | Retrieve aggregate token stats & user approval table |
| `/api/ai/admin/users/{id}/status` | `POST` | Admin | Set user status to `approved`, `revoked`, or `pending` |
| `/api/expenses/voice-agent` | `POST` | Approved | Process natural language voice narration |
