# How to Get a Gemini API Key from Google AI Studio

This guide explains how to get your Gemini API key from **Google AI Studio**, whether a billing setup is required, and how to configure it in **MyMoney**.

---

## 1. Step-by-Step Instructions to Get a Gemini API Key

1. **Open Google AI Studio**:
   - Navigate to [https://aistudio.google.com/](https://aistudio.google.com/) in your web browser.
   - Sign in with your Google account.

2. **Create/Get API Key**:
   - Click on the **"Get API key"** button in the top left navigation sidebar or header.
   - Click **"Create API key"**.
   - You can choose to create a key in a **New Project** or select an existing Google Cloud Project.
   - Click **"Create API key in new project"**.

3. **Copy Your Key**:
   - Once generated, copy the API key (it starts with `AIzaSy...`).
   - Store it securely. **Never commit raw API keys to public repositories**.

---

## 2. Is Billing Setup Required?

### Short Answer: **No for basic/free usage**, but **Optional for Pay-As-You-Go / Higher Rate Limits**.

- **Free Tier (Default)**:
  - **No credit card or billing setup required!**
  - Allows generous usage limits (e.g. 15 requests per minute for Gemini 1.5 Flash).
  - Perfect for personal finance tracking, receipt scanning, and voice agent interactions in MyMoney.

- **Pay-As-You-Go / Pro Tier (Optional)**:
  - If you require higher rate limits (higher Requests Per Minute / Tokens Per Minute) or enterprise quotas, you can enable billing by attaching a Google Cloud Billing account.
  - Billing is set up via Google Cloud Console linked to your AI Studio project.

---

## 3. How to Set Up the Key in MyMoney

### Method A: Environment Variable (Recommended for Server / Local Running)

Set the `GEMINI_API_KEY` environment variable on your machine or server:

#### Windows (PowerShell):
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

#### Windows (CMD):
```cmd
set GEMINI_API_KEY=your_api_key_here
```

#### Linux / macOS / Render / Vercel:
```bash
export GEMINI_API_KEY="your_api_key_here"
```

---

## 4. Troubleshooting & Best Practices

- **Rate Limit Errors (429 / 503)**: If you hit free tier limits, retry after a few seconds or upgrade your project quota in Google Cloud Console.
- **Key Verification**: Test your key using a quick curl command:
  ```bash
  curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"parts":[{"text": "Hello Gemini!"}]}]}'
  ```
