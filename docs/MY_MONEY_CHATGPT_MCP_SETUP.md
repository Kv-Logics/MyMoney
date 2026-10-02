# How to Connect MyMoney to ChatGPT

## What this does
MyMoney can be connected to ChatGPT.
After connecting it, you can talk to ChatGPT and ask it to read or modify your MyMoney data.

Examples of what you can say:
- "Show my expenses"
- "Add a lunch expense for $15"
- "How much did I spend this week?"
- "What is my daily profit?"

## Step-by-Step Setup Guide

### 1. Create a New Custom Assistant
1. Go to [ChatGPT](https://chatgpt.com) and log in.
2. Click on your profile picture in the top right corner.
3. Select **My GPTs** and click **Create a GPT**.
4. Give your new assistant a name, like "MyMoney".

### 2. Connect Your Data
1. In the GPT builder, click on the **Configure** tab at the top.
2. Scroll down to the bottom and click on **Create new action**.
3. Under the "Schema" section, click on **Import from URL**.
4. Enter this exact link:
   `https://mymoney-jd0n.onrender.com/docs/openapi-chatgpt.json`
5. Click **Import**. This tells ChatGPT what commands it can use to manage your expenses and profits.

### 3. Set Up Secure Access
1. Below the schema, look for the **Authentication** section and click the **Gear icon (⚙️)**.
2. Change the Authentication Type to **OAuth**.
3. *If prompted for Client details, enter the provided Client ID for your MyMoney server.*
4. Save the authentication settings. When you first use the action, ChatGPT will securely ask you to "Sign In" to your MyMoney account.

### 4. Save and Start Using
1. Look at the top right of your screen and click **Create** (or **Update**).
2. For privacy, choose **Only me**. (You do not want anyone else accessing your personal financial data).
3. Click **Confirm**.

**You are done!**
You can now open your "MyMoney" assistant in ChatGPT and just type or speak to manage your finances!
