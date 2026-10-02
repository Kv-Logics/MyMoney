
# MyMoney + ChatGPT MCP Setup Guide

Connect your **MyMoney account to ChatGPT** and manage your expenses, budgets, savings, and daily profits using normal language.

> **You do not need to know programming or MCP to use this guide.**

---

## What is this?

MCP is simply a secure connection that allows ChatGPT to communicate with MyMoney.

Once connected, instead of opening MyMoney every time, you can ask ChatGPT things like:

> "Show my expenses today."

> "Add ₹250 for lunch."

> "How much did I spend this month?"

> "Today's profit was ₹350."

> "How many profitable days did I have this month?"

ChatGPT will communicate with your MyMoney account and perform the requested operation.

---

# 1. What You Need

Before starting, you need:

- A MyMoney account
- A ChatGPT account
- A ChatGPT plan/workspace that supports the required MCP functionality
- Internet access

You **do not need**:

- Python
- MongoDB
- FastAPI
- Programming knowledge
- An API key
- A terminal
- To install MCP on your computer

---

# 2. MyMoney MCP Server

The official MyMoney MCP server is:

```text
https://mymoney-jd0n.onrender.com/mcp

Important

Use the URL exactly as shown above.

Do not add:

/docs
/openapi.json
/docs/openapi-chatgpt.json

The MCP connection uses the /mcp endpoint.


---

3. Connect MyMoney to ChatGPT

Open ChatGPT in a web browser.

Depending on your ChatGPT version or workspace, the names of menus may be slightly different.

Look for the area related to:

Settings

Apps

Connectors

Developer Mode

Custom MCP servers


Enable Developer Mode if ChatGPT asks you to enable it.

Then choose the option to create/add a custom MCP server.


---

4. Enter MyMoney Details

When ChatGPT asks for the MCP server details, enter:

Name

MyMoney

Description

Manage my MyMoney expenses, budgets, savings, and daily profit tracking.

Server URL

https://mymoney-jd0n.onrender.com/mcp

Authentication

Select:

OAuth

Then continue with the connection.


---

5. Sign in to MyMoney

ChatGPT should open the MyMoney authorization/login page.

Sign in using your normal MyMoney account.

After signing in, ChatGPT will show the permissions requested by MyMoney.

Review them and approve the connection.

You should then be returned to ChatGPT.


---

Important Security Rule

Never paste any of these into a normal ChatGPT message:

MyMoney password
mm_live_ API key
JWT token
MongoDB credentials
OpenAI API key

The normal MCP connection uses the OAuth login flow.

Only connect to the official MyMoney MCP server:

https://mymoney-jd0n.onrender.com/mcp


---

6. Scan the MyMoney Tools

After connecting, ChatGPT should scan the MCP server and discover the available tools.

You should see tools related to:

Expenses

View expenses

Create expenses

Update expenses

Delete expenses

View expense summaries


Budgets

View budgets

Create/update budgets


Savings

View savings goals


Daily Profit

Record daily profit

View daily profit

List daily profits

View profit summary

Update daily profit

Delete daily profit



---

7. Test the Connection

After connecting MyMoney, open a new ChatGPT conversation.

Select/use the MyMoney app if ChatGPT requires you to select it.

Then try:

Show my expenses today.

If everything is working, ChatGPT should retrieve your MyMoney expenses.


---

8. Add an Expense Using ChatGPT

You can simply say:

Add ₹250 for lunch today.

Or:

Add an expense of ₹500 for groceries, paid by UPI.

ChatGPT may ask you to confirm before making a change.

Always review the information before confirming.


---

9. Read Your Expenses

Examples:

Show my expenses today.

How much did I spend this month?

Show my food expenses this week.

What was my biggest expense this month?

Show my UPI expenses from the last 7 days.


---

10. Manage Your Budgets

You can ask:

Show my current budgets.

Set my food budget to ₹8,000 this month.

Change my overall monthly budget to ₹25,000.


---

11. Check Your Savings

You can ask:

Show my savings goals.


---

12. Daily Profit Tracker

MyMoney also has a separate Daily Profit Tracker.

This is intentionally independent from:

Expenses

Budgets

Savings


Recording a profit does not create an expense.

It does not change your expense total.

It does not change your budget.


---

Record Today's Profit

Simply say:

Today's profit was ₹350.

MyMoney records:

Date: Today
Profit: ₹350
Profitable day: Yes


---

Record No Profit

You can say:

Today's profit was ₹0.

This records:

Profit: ₹0
Profitable day: No


---

Record a Loss

You can say:

Today's result was a loss of ₹200.

This records:

Profit: -₹200
Loss day: Yes


---

13. Correct Today's Profit

There is only one daily profit record for each date.

For example, you say:

Today's profit was ₹300.

Later you realize it was actually ₹450.

Simply say:

Actually, today's profit was ₹450.

The existing record for today should be updated instead of creating another daily record.


---

14. Ask About Your Profit

Examples:

How many profitable days did I have this month?

What is my total profit this month?

Show my daily profit for the last 7 days.

What was my highest profit this month?

What was my lowest profit this month?

What is my average profit on profitable days?

Show me my profit for September.


---

15. Profit Tracking Rules

The Daily Profit Tracker uses these rules:

Daily Amount	Meaning

Greater than ₹0	Profitable day
₹0	No-profit day
Less than ₹0	Loss day


For example:

₹500 → Profitable day
₹100 → Profitable day
₹0 → No-profit day
-₹200 → Loss day

The tracker can calculate:

Total profit

Number of profitable days

Number of no-profit days

Number of loss days

Average profit on profitable days

Highest profit

Lowest profit

Daily profit history



---

16. Expenses vs Profit

These are two separate systems.

MyMoney
                       │
          ┌────────────┴────────────┐
          │                         │
   Existing Finance           Daily Profit
          │                         │
      Expenses                Daily Profit
      Budgets                 Profit Days
      Savings                 Loss Days
                              Statistics

For example:

"Spent ₹500 on food"

is an expense.

While:

"Today's profit was ₹700"

is a profit record.

They are not automatically connected.


---

17. Confirmation for Changes

Some operations change your data.

For example:

Adding an expense

Updating an expense

Deleting an expense

Changing a budget

Recording profit

Updating profit

Deleting profit


ChatGPT may ask you to confirm these operations.

Always check the details before approving the action.

For example, if ChatGPT says:

> Add ₹500 Food expense for October 3, paid by UPI?



Check that the amount, category, date, and payment method are correct before confirming.


---

18. Troubleshooting

MyMoney is not visible

Make sure your ChatGPT account/workspace supports custom MCP servers.

If required, enable Developer Mode.


---

ChatGPT cannot connect

Check that you entered exactly:

https://mymoney-jd0n.onrender.com/mcp

Do not add /docs or /openapi.json.


---

OAuth login does not appear

Try disconnecting the MyMoney connection and connecting it again.

Also make sure the MyMoney server is available.


---

I can read data but cannot modify it

MCP write/modify capabilities depend on the ChatGPT plan and workspace permissions currently available to your account.

Your MyMoney server supports write operations, but ChatGPT may restrict write operations depending on your plan/workspace.


---

Some tools are missing

Open the MyMoney MCP configuration and run the tool scan/refresh option if available.

The available tool names may also depend on the permissions granted to the connection.


---

ChatGPT asks me to connect MyMoney again

OAuth sessions can expire or require reauthorization.

Simply complete the MyMoney authorization process again.


---

19. Disconnect MyMoney

If you no longer want ChatGPT connected to MyMoney, remove/disconnect the MyMoney app from your ChatGPT Apps/Connectors settings.

Disconnecting ChatGPT does not delete your MyMoney account or your stored financial data.


---

20. Quick Setup

If you already understand the basics, the entire setup is:

Step 1

Open ChatGPT in a web browser.

Step 2

Open the Apps/Developer Mode area.

Step 3

Create a custom MCP server.

Step 4

Enter:

Name:
MyMoney

Server URL:
https://mymoney-jd0n.onrender.com/mcp

Authentication:
OAuth

Step 5

Connect and scan the tools.

Step 6

Sign in to your MyMoney account.

Step 7

Approve the requested permissions.

Step 8

Test:

Show my expenses today.

Step 9

Test the independent profit tracker:

Today's profit was ₹350.

Step 10

Ask:

How many profitable days did I have this month?


---

21. Example Conversation

You can use MyMoney naturally.

You:

Show my expenses today.

ChatGPT:

Retrieves today's expenses.

You:

Add ₹180 for dinner, paid by UPI.

ChatGPT:

Asks for confirmation if required and creates the expense.

You:

Today's profit was ₹450.

ChatGPT:

Records ₹450 as today's independent profit.

You:

How many profitable days did I have this month?

ChatGPT:

Returns the number of profitable days based on your daily profit records.


---

FAQ

Do I need programming knowledge?

No.

The setup is designed to be used through ChatGPT.

Do I need to install MCP?

No.

MyMoney provides the MCP server online.

Do I need an API key?

Not for the normal OAuth connection.

Do not paste your mm_live_ API key into ChatGPT.

Can ChatGPT add expenses?

Yes, when write actions are available to your ChatGPT account/workspace.

Can ChatGPT track my daily profit?

Yes.

For example:

Today's profit was ₹500.

Does profit tracking change my expenses?

No.

The Daily Profit Tracker is independent of the existing expense system.

Can ChatGPT access another user's MyMoney data?

The MCP connection is authenticated to the connected MyMoney account. Requests are isolated to the authenticated user.

Can I disconnect MyMoney later?

Yes.

Remove the MyMoney connection from your ChatGPT Apps/Connectors settings.

Do I need to know what MCP means?

No.

You only need the server URL and the OAuth login.


---

Important Information

The exact ChatGPT menu names and setup screens can change over time.

If your ChatGPT interface looks different from the instructions above, look for the equivalent Apps, Developer Mode, Connectors, or Custom MCP Server option.

For the latest ChatGPT MCP availability and plan restrictions, refer to OpenAI's current documentation.


---

MyMoney MCP Server

https://mymoney-jd0n.onrender.com/mcp

Use this URL when connecting MyMoney to ChatGPT.