# MyMoney MCP Plugin for ChatGPT

## 1. What MyMoney MCP Does
This plugin allows ChatGPT to securely connect to your personal MyMoney account using the Model Context Protocol (MCP). Once connected, ChatGPT can act as your personal finance assistant. It can read your current expenses and profits, and it can add or modify records whenever you ask it to—all from within your normal chat window.

## 2. How to Connect in ChatGPT
Rather than uploading files, you can connect your MyMoney MCP server directly in ChatGPT:

1. In ChatGPT, navigate to the settings or area for adding **Custom MCP Servers** (or Connectors/Developer Mode depending on your plan).
2. Create a new connection and enter the direct MCP URL:
   `https://mymoney-jd0n.onrender.com/mcp`
3. Under Authentication, select **OAuth**.
4. ChatGPT will prompt you to "Sign In" to your MyMoney account. Log in and authorize the connection to securely link your data.

## 3. How to Use Expenses and Budgets
Your expenses and budgets are tracked securely. You can ask ChatGPT to add new expenses, show your spending summaries, list past expenses, or check your current budget limits. *Note: You must explicitly specify the category and amount for expenses and budgets when asking ChatGPT to record them.*

## 4. How to Use the Independent Daily Profit Tracker
MyMoney also includes a standalone Daily Profit Tracker. **This operates completely separate from your expenses and budgets.** It strictly tracks your raw profit or loss day by day. Recording a profit does not change your expenses or budgets.

## 5. Example Prompts
You can just talk to ChatGPT naturally. Here are some examples:
* *"I spent $15 on Food today, add it."*
* *"Show my expense summary for this month."*
* *"Today's profit was $250."*
* *"Did I have any loss days this week? Show my profit summary."*

## 6. Security Instructions
* **Direct Connection Only:** Only connect to the official MyMoney MCP server: `https://mymoney-jd0n.onrender.com/mcp`.
* **Keep it Private:** Do not share your OAuth sessions or personal MyMoney credentials with anyone.
* **Revoke Access Anytime:** If you lose your ChatGPT account, you can log into the MyMoney web app and revoke ChatGPT's OAuth access immediately.
