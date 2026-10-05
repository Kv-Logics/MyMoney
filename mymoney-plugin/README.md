# MyMoney MCP Plugin for ChatGPT

## 1. What MyMoney MCP Does
This plugin allows ChatGPT to securely connect to your personal MyMoney account using the Model Context Protocol (MCP). Once connected, ChatGPT can act as your personal finance assistant. It can read your current expenses and profits, and it can add or modify records whenever you ask it to—all from within your normal chat window.

## 2. How to Install the ZIP in ChatGPT
1. Go to [ChatGPT](https://chatgpt.com) and log into your account.
2. Click your profile icon in the top right and select **My GPTs** -> **Create a GPT**.
3. Under the **Configure** tab, scroll down to the **Actions** section.
4. If ChatGPT supports uploading an MCP plugin directly, upload the `MyMoney-ChatGPT-MCP.zip` file.
5. If using manual setup, click **Create new action**, choose **Import from URL**, and enter `https://mymoney-jd0n.onrender.com/mcp` instead of using the ZIP. 

## 3. How to Complete OAuth (Secure Login)
Your data is securely protected by OAuth, which ensures ChatGPT only acts on your behalf with your permission.
1. When setting up the action, look for the **Authentication** section (click the ⚙️ Gear icon).
2. Set the Authentication type to **OAuth**.
3. The first time you ask ChatGPT to check your finances, it will show a "Sign In" button.
4. Click "Sign In," log into your MyMoney account, and authorize the connection. ChatGPT will then remember you securely.

## 4. How to Use Expenses
Your expenses are tracked normally. You can ask ChatGPT to add new expenses, show your spending summaries, or list past expenses. It will automatically categorize them (e.g., Food, Travel, Utilities) and deduct them against your budgets.

## 5. How to Use the Independent Daily Profit Tracker
MyMoney also includes a standalone Daily Profit Tracker. **This operates completely separate from your expenses and budgets.** It strictly tracks your raw profit or loss day by day. 

## 6. Example Prompts
You can just talk to ChatGPT naturally. Here are some examples:
* *"I spent $15 on lunch today, add it."*
* *"Show my expense summary for this month."*
* *"Today's profit was $250."*
* *"Did I have any loss days this week? Show my profit summary."*

## 7. Security Instructions
* **Never share your ZIP file:** If you have manually injected any API keys or personal URLs into these files, do not share them. (The default files do not contain keys).
* **Keep your Custom GPT Private:** When saving your new Assistant in ChatGPT, choose **"Only me"**. Do not publish it to the public GPT store, as it links directly to your private financial data.
* **Revoke Access Anytime:** If you lose your ChatGPT account, you can log into the MyMoney web app and revoke ChatGPT's API keys or OAuth access immediately.
