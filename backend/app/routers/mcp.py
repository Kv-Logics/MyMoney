import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from bson import ObjectId
import jwt

from app.database import get_collection
from app.auth import JWT_SECRET, JWT_ALGORITHM, hash_api_key, API_KEY_PREFIX
from app.utils import serialize_doc, serialize_docs
from app.profit_tracker.service import profit_service
from app.routers.pocket_money import compute_pocket_money_summary

router = APIRouter(tags=["MCP Server"])

ISSUER = "https://mymoney-jd0n.onrender.com"
RESOURCE_URI = "https://mymoney-jd0n.onrender.com"
PROTECTED_RESOURCE_URL = f"{ISSUER}/.well-known/oauth-protected-resource"
WWW_AUTH_HEADER = f'Bearer resource_metadata="{PROTECTED_RESOURCE_URL}"'

def get_mcp_auth_error_payload(msg: str = "Authentication required"):
    return {
        "_meta": {
            "mcp/www_authenticate": [
                f'Bearer resource_metadata="{PROTECTED_RESOURCE_URL}", error="invalid_token", error_description="{msg}"'
            ]
        }
    }

def authenticate_mcp_request(request: Request) -> tuple[Optional[dict], Optional[str]]:
    """
    Validates Bearer token from HTTP Authorization header.
    Supports OAuth Access Tokens (verifying iss, aud, exp, sub) and mm_live_ API Keys.
    Returns: (user_dict, error_message)
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "Missing or malformed Authorization header"

    token = auth_header.replace("Bearer ", "").strip()
    if not token:
        return None, "Empty Bearer token"

    users_col = get_collection("users")

    # 1. API Key authentication fallback (mm_live_...)
    if token.startswith(API_KEY_PREFIX):
        key_hash = hash_api_key(token)
        user = users_col.find_one({"api_key_hash": key_hash, "api_key_active": True})
        if not user:
            return None, "Invalid or revoked API Key"
        expires_at = user.get("api_key_expires_at")
        if expires_at and expires_at < datetime.utcnow():
            return None, "API Key has expired"
        user["_id"] = str(user["_id"])
        user["id"] = user["_id"]
        return user, None

    # 2. OAuth JWT Access Token authentication
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_signature": True, "verify_exp": True, "verify_aud": False}
        )
        
        # Explicitly verify issuer and audience/resource
        iss = payload.get("iss")
        aud = payload.get("aud")
        if iss and iss.rstrip("/") != ISSUER.rstrip("/"):
            return None, "Invalid token issuer"
        if aud and aud.rstrip("/") != RESOURCE_URI.rstrip("/"):
            return None, "Invalid token audience/resource"

        sub = payload.get("sub")
        email = payload.get("email")

        if sub:
            user = users_col.find_one({"_id": ObjectId(sub)})
        elif email:
            user = users_col.find_one({"email": email})
        else:
            user = None

        if not user:
            return None, "User not found for token"

        user["_id"] = str(user["_id"])
        user["id"] = user["_id"]
        user["scopes"] = payload.get("scope", "").split()
        return user, None

    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.PyJWTError as e:
        return None, f"Invalid token: {str(e)}"

# --- 9 MCP TOOLS SPECIFICATIONS ---
MCP_TOOLS = [
    {
        "name": "get_user_profile",
        "description": "Get connected user account profile details.",
        "inputSchema": { "type": "object", "properties": {} },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["profile:read"] }],
        "annotations": { "readOnlyHint": True },
        "_meta": { "openai/profile": True }
    },
    {
        "name": "expense_tracker",
        "description": "Comprehensive Expense Tracker for MyMoney. Use this tool whenever the user asks to manage the expense tracker, log or add an expense, view recent spending, check spending breakdown, or track weekly allowance / pocket money from parents. Actions: 'add' (record expense), 'list' (view/filter expenses), 'summary' (spending overview), 'allowance' (get or set weekly pocket money from parent).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["add", "list", "summary", "allowance"],
                    "description": "Action to perform: 'add' to record a new expense, 'list' to view expenses, 'summary' for category and monthly totals, 'allowance' for parent weekly pocket money"
                },
                "title": { "type": "string", "description": "Title or item name (e.g. Groceries, Dinner, Taxi)" },
                "amount": { "type": "number", "description": "Amount spent or allowance received in user currency" },
                "category": { "type": "string", "description": "Category like Food, Travel, Rent, Fuel, Grocery, Shopping, Medical, Utilities, Miscellaneous, Other" },
                "date": { "type": "string", "description": "Date YYYY-MM-DD (defaults to today)" },
                "payment_method": { "type": "string", "description": "Cash, UPI, Credit Card, Debit Card, Bank Transfer" },
                "notes": { "type": "string", "description": "Optional notes or details" },
                "search": { "type": "string", "description": "Search keyword for filtering" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["expenses:read", "expenses:write"] }],
        "annotations": { "destructiveHint": False }
    },
    {
        "name": "list_expenses",
        "description": "List and filter user expenses from the Expense Tracker. Use this whenever the user wants to see their expenses, search transactions, or check history.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "category": { "type": "string", "description": "Category filter" },
                "payment_method": { "type": "string" },
                "start_date": { "type": "string", "description": "YYYY-MM-DD" },
                "end_date": { "type": "string", "description": "YYYY-MM-DD" },
                "min_amount": { "type": "number" },
                "max_amount": { "type": "number" },
                "search": { "type": "string" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["expenses:read"] }],
        "annotations": { "readOnlyHint": True }
    },
    {
        "name": "create_expense",
        "description": "Create and record a new expense item in the Expense Tracker. ALWAYS use this tool or expense_tracker when the user mentions spending money, buying something, or adding an expense.",
        "inputSchema": {
            "type": "object",
            "required": ["title", "amount", "category", "payment_method", "date"],
            "properties": {
                "title": { "type": "string" },
                "amount": { "type": "number" },
                "category": { "type": "string", "description": "Category like Food, Travel, Rent, Fuel, Grocery, Shopping, Medical, Utilities, Miscellaneous, Other" },
                "payment_method": { "type": "string" },
                "date": { "type": "string", "description": "YYYY-MM-DD" },
                "description": { "type": "string" },
                "time": { "type": "string" },
                "location": { "type": "string" },
                "notes": { "type": "string" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["expenses:write"] }],
        "annotations": { "destructiveHint": False }
    },
    {
        "name": "update_expense",
        "description": "Update an existing expense item by ID.",
        "inputSchema": {
            "type": "object",
            "required": ["id"],
            "properties": {
                "id": { "type": "string" },
                "title": { "type": "string" },
                "amount": { "type": "number" },
                "category": { "type": "string" },
                "payment_method": { "type": "string" },
                "date": { "type": "string" },
                "description": { "type": "string" },
                "notes": { "type": "string" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["expenses:write"] }],
        "annotations": { "destructiveHint": False }
    },
    {
        "name": "delete_expense",
        "description": "Delete an expense item by ID.",
        "inputSchema": {
            "type": "object",
            "required": ["id"],
            "properties": {
                "id": { "type": "string" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["expenses:write"] }],
        "annotations": { "destructiveHint": True }
    },
    {
        "name": "get_expense_summary",
        "description": "Get overall spending summary, monthly total, today's spending, and category distribution.",
        "inputSchema": { "type": "object", "properties": {} },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["expenses:read"] }],
        "annotations": { "readOnlyHint": True }
    },
    {
        "name": "list_budgets",
        "description": "List monthly category and overall budget limits.",
        "inputSchema": { "type": "object", "properties": {} },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["budgets:read"] }],
        "annotations": { "readOnlyHint": True }
    },
    {
        "name": "create_or_update_budget",
        "description": "Set or update monthly category or overall budget limit.",
        "inputSchema": {
            "type": "object",
            "required": ["category", "amount"],
            "properties": {
                "category": { "type": "string" },
                "amount": { "type": "number" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["budgets:write"] }],
        "annotations": { "destructiveHint": False }
    },
    {
        "name": "manage_allowance",
        "description": "Manage the Pocket Money Box / Parent Allowance. Use this tool whenever the user mentions getting pocket money or allowance from parents (e.g. father/mother), checking available pocket money balance, scheduling future pocket money, or recording past pocket money. Actions: 'add' or 'set' (deposits money into the box with amount, start_date, and note), 'get' (returns available balance, active total, waiting future deposits, and spending), 'list' (lists all box deposits), 'delete' (deletes a deposit by deposit_id).",
        "inputSchema": {
            "type": "object",
            "required": ["action"],
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["add", "set", "get", "list", "delete"],
                    "description": "'add' or 'set' to deposit pocket money, 'get' to check available balance and waiting money, 'list' to see all box deposits, 'delete' to remove a deposit"
                },
                "amount": { "type": "number", "description": "Pocket money amount in user's currency (required when action='add' or 'set')" },
                "start_date": { "type": "string", "description": "Date from which this money is utilized (YYYY-MM-DD). Can be past (deducts past expenses), today, or future (waiting/scheduled)." },
                "notes": { "type": "string", "description": "Optional note (e.g., 'From Dad', 'For college travel and snacks')" },
                "deposit_id": { "type": "string", "description": "Deposit ID to delete (when action='delete')" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["budgets:write", "budgets:read"] }],
        "annotations": { "destructiveHint": False }
    },
    {
        "name": "list_savings_goals",
        "description": "List active savings goals and saved amounts.",
        "inputSchema": { "type": "object", "properties": {} },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["savings:read"] }],
        "annotations": { "readOnlyHint": True }
    },
    {
        "name": "record_daily_profit",
        "description": "Record today's or any specific date's daily profit (completely separate from expenses/budgets). ALWAYS use this tool when the user mentions today's profit, earnings, or revenue. If a record already exists for that date, it is automatically updated (upsert). amount > 0 means profitable day, amount == 0 means no-profit day, amount < 0 means loss day.",
        "inputSchema": {
            "type": "object",
            "required": ["date", "amount"],
            "properties": {
                "date": { "type": "string", "description": "YYYY-MM-DD. Use today's date if user says 'today'." },
                "amount": { "type": "number", "description": "Profit amount in user's currency. >0 for profit, 0 for no profit, <0 for loss." },
                "note": { "type": "string", "description": "Optional note or description about this day's profit." }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["profit:write"] }],
        "annotations": { "destructiveHint": False }
    },
    {
        "name": "get_daily_profit",
        "description": "Get the daily profit record for a specific date. Use this when the user asks about profit/earnings for a particular day.",
        "inputSchema": {
            "type": "object",
            "required": ["date"],
            "properties": {
                "date": { "type": "string", "description": "YYYY-MM-DD" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["profit:read"] }],
        "annotations": { "readOnlyHint": True }
    },
    {
        "name": "list_daily_profits",
        "description": "List daily profit records. Defaults to the current calendar month if no date range is specified. Pass start_date and end_date to filter a custom range.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "start_date": { "type": "string", "description": "YYYY-MM-DD. Defaults to first day of current month." },
                "end_date": { "type": "string", "description": "YYYY-MM-DD. Defaults to today." }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["profit:read"] }],
        "annotations": { "readOnlyHint": True }
    },
    {
        "name": "get_profit_summary",
        "description": "Get daily profit analytics and summary stats: total_profit, profitable_days, no_profit_days, loss_days, average profit, highest and lowest profit. Defaults to current month if no date range given.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "start_date": { "type": "string", "description": "YYYY-MM-DD. Defaults to first day of current month." },
                "end_date": { "type": "string", "description": "YYYY-MM-DD. Defaults to today." }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["profit:read"] }],
        "annotations": { "readOnlyHint": True }
    },
    {
        "name": "update_daily_profit",
        "description": "Update an existing daily profit record by its ID or date. Use this ONLY when the user explicitly says to update/correct/change an existing profit entry. For recording today's profit, use record_daily_profit instead.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "id": { "type": "string", "description": "MongoDB document ID of the profit record" },
                "date": { "type": "string", "description": "YYYY-MM-DD of the record to update" },
                "amount": { "type": "number", "description": "New profit amount" },
                "note": { "type": "string", "description": "Updated note" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["profit:write"] }],
        "annotations": { "destructiveHint": False }
    },
    {
        "name": "delete_daily_profit",
        "description": "Permanently delete a daily profit record by its ID or date. This action cannot be undone.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "id": { "type": "string", "description": "MongoDB document ID of the profit record" },
                "date": { "type": "string", "description": "YYYY-MM-DD of the record to delete" }
            }
        },
        "securitySchemes": [{ "type": "oauth2", "scopes": ["profit:write"] }],
        "annotations": { "destructiveHint": True }
    }
]

# --- STREAMABLE HTTP MCP ENDPOINT ---
@router.post("/mcp")
async def handle_mcp_post(request: Request):
    user, err_msg = authenticate_mcp_request(request)
    
    # Try parsing JSON-RPC request body
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": None}
        )

    req_id = body.get("id")
    method = body.get("method")
    params = body.get("params", {})

    # Protocol Metadata Methods (Can respond before strict tool execution)
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "mymoney-mcp",
                    "version": "1.0.0"
                }
            }
        }

    if method == "notifications/initialized":
        return { "jsonrpc": "2.0", "result": {} }

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS
            }
        }

    # Tool Execution (`tools/call`) Requires Valid Authentication!
    if method == "tools/call":
        if not user:
            headers = { "WWW-Authenticate": f'Bearer resource_metadata="{PROTECTED_RESOURCE_URL}", error="invalid_token", error_description="{err_msg}"' }
            return JSONResponse(
                status_code=401,
                headers=headers,
                content={
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32001,
                        "message": f"Authentication required: {err_msg}",
                        "data": get_mcp_auth_error_payload(err_msg)
                    }
                }
            )

        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        user_id = user["id"]

        try:
            res_content = execute_mcp_tool(tool_name, arguments, user)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(res_content, indent=2, default=str)
                        }
                    ]
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "isError": True,
                    "content": [
                        {
                            "type": "text",
                            "text": f"Error executing tool '{tool_name}': {str(e)}"
                        }
                    ]
                }
            }

    return JSONResponse(
        status_code=400,
        content={"jsonrpc": "2.0", "error": {"code": -32601, "message": f"Method '{method}' not found"}, "id": req_id}
    )

@router.get("/mcp")
def handle_mcp_get():
    return {
        "status": "ok",
        "server": "mymoney-mcp",
        "mcp_version": "2024-11-05",
        "protected_resource": PROTECTED_RESOURCE_URL
    }

def normalize_mcp_category(cat: Any) -> str:
    if not cat or not isinstance(cat, str):
        return "Other"
    clean = cat.strip()
    low = clean.lower()
    mapping = {
        "food": "Food",
        "dining": "Food",
        "lunch": "Food",
        "dinner": "Food",
        "breakfast": "Food",
        "snacks": "Food",
        "grocery": "Grocery",
        "groceries": "Grocery",
        "travel": "Travel",
        "transport": "Travel",
        "fuel": "Fuel",
        "gas": "Fuel",
        "petrol": "Fuel",
        "rent": "Rent",
        "utilities": "Utilities",
        "electricity": "Electricity",
        "water": "Water",
        "shopping": "Shopping",
        "entertainment": "Entertainment",
        "medical": "Medical",
        "education": "Education",
        "subscription": "Subscription",
        "subscriptions": "Subscription",
        "miscellaneous": "Miscellaneous",
        "misc": "Miscellaneous",
        "other": "Other",
        "others": "Other"
    }
    return mapping.get(low, clean.title() if clean else "Other")

def execute_mcp_tool(name: str, args: dict, user: dict) -> Any:
    user_id = user["id"]

    # 0. expense_tracker (Unified Expense Tracker action)
    if name == "expense_tracker":
        action = args.get("action", "summary")
        if action == "add":
            if not args.get("date"):
                args["date"] = datetime.utcnow().strftime("%Y-%m-%d")
            return execute_mcp_tool("create_expense", args, user)
        elif action == "list":
            return execute_mcp_tool("list_expenses", args, user)
        elif action == "allowance":
            sub_action = args.get("sub_action")
            if not sub_action:
                sub_action = "add" if "amount" in args and args["amount"] is not None and float(args["amount"]) > 0 else "get"
            allowance_payload = {
                "action": sub_action,
                "amount": args.get("amount"),
                "start_date": args.get("start_date") or args.get("date"),
                "notes": args.get("notes") or args.get("note") or args.get("title") or "From Parent"
            }
            return execute_mcp_tool("manage_allowance", allowance_payload, user)
        else:
            return execute_mcp_tool("get_expense_summary", args, user)

    # 1. get_user_profile
    if name == "get_user_profile":
        # Generate stable opaque profile id from user_id hash
        stable_opaque_id = f"prof_{hashlib.sha256(user_id.encode()).hexdigest()[:16]}"
        return {
            "id": stable_opaque_id,
            "name": user.get("name", "User"),
            "email": user.get("email"),
            "nickname": user.get("name", "User").split()[0],
            "currency": user.get("currency", "INR")
        }

    # 2. list_expenses
    if name == "list_expenses":
        expenses_col = get_collection("expenses")
        query = {"user_id": user_id}
        if args.get("category"):
            query["category"] = args["category"]
        if args.get("payment_method"):
            query["payment_method"] = args["payment_method"]
        if args.get("start_date") or args.get("end_date"):
            query["date"] = {}
            if args.get("start_date"):
                query["date"]["$gte"] = args["start_date"]
            if args.get("end_date"):
                query["date"]["$lte"] = args["end_date"]
        if args.get("min_amount") or args.get("max_amount"):
            query["amount"] = {}
            if args.get("min_amount") is not None:
                query["amount"]["$gte"] = float(args["min_amount"])
            if args.get("max_amount") is not None:
                query["amount"]["$lte"] = float(args["max_amount"])
        if args.get("search"):
            query["$or"] = [
                {"title": {"$regex": args["search"], "$options": "i"}},
                {"description": {"$regex": args["search"], "$options": "i"}},
                {"notes": {"$regex": args["search"], "$options": "i"}}
            ]
        items = list(expenses_col.find(query).sort([("date", -1)]))
        return serialize_docs(items)

    # 3. create_expense
    if name == "create_expense":
        expenses_col = get_collection("expenses")
        new_item = {
            "user_id": user_id,
            "user_email": user["email"],
            "title": args.get("title"),
            "amount": float(args.get("amount", 0)),
            "category": normalize_mcp_category(args.get("category", "Other")),
            "payment_method": args.get("payment_method", "Cash"),
            "date": args.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
            "description": args.get("description", ""),
            "time": args.get("time", ""),
            "location": args.get("location", ""),
            "receipt_image": "",
            "notes": args.get("notes", ""),
            "created_at": datetime.utcnow()
        }
        res = expenses_col.insert_one(new_item)
        new_item["_id"] = res.inserted_id
        return serialize_doc(new_item)

    # 4. update_expense
    if name == "update_expense":
        expenses_col = get_collection("expenses")
        exp_id = args.get("id")
        existing = expenses_col.find_one({"_id": ObjectId(exp_id), "user_id": user_id})
        if not existing:
            raise Exception("Expense item not found or unauthorized")
        update_fields = {}
        for field in ["title", "amount", "category", "payment_method", "date", "description", "time", "location", "notes"]:
            if field in args and args[field] is not None:
                if field == "amount":
                    update_fields[field] = float(args[field])
                elif field == "category":
                    update_fields[field] = normalize_mcp_category(args[field])
                else:
                    update_fields[field] = args[field]
        update_fields["updated_at"] = datetime.utcnow()
        expenses_col.update_one({"_id": ObjectId(exp_id)}, {"$set": update_fields})
        updated = expenses_col.find_one({"_id": ObjectId(exp_id)})
        return serialize_doc(updated)

    # 5. delete_expense
    if name == "delete_expense":
        expenses_col = get_collection("expenses")
        exp_id = args.get("id")
        res = expenses_col.delete_one({"_id": ObjectId(exp_id), "user_id": user_id})
        if res.deleted_count == 0:
            raise Exception("Expense not found or unauthorized")
        return {"status": "success", "message": "Expense deleted successfully"}

    # 6. get_expense_summary
    if name == "get_expense_summary":
        expenses_col = get_collection("expenses")
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
        today_str = now.strftime("%Y-%m-%d")

        pipeline_month = [
            {"$match": {"user_id": user_id, "date": {"$gte": start_of_month}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        res_m = list(expenses_col.aggregate(pipeline_month))
        month_total = res_m[0]["total"] if res_m else 0.0

        pipeline_today = [
            {"$match": {"user_id": user_id, "date": today_str}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        res_t = list(expenses_col.aggregate(pipeline_today))
        today_total = res_t[0]["total"] if res_t else 0.0

        pipeline_cat = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        categories_data = [{"category": i["_id"], "amount": i["total"], "count": i["count"]} for i in expenses_col.aggregate(pipeline_cat)]

        budgets_col = get_collection("budgets")
        allowance_doc = budgets_col.find_one({"user_id": user_id, "category": "Weekly Allowance"})
        allowance_info = None
        if allowance_doc:
            monday = now - timedelta(days=now.weekday())
            res_w = list(expenses_col.aggregate([
                {"$match": {"user_id": user_id, "date": {"$gte": monday.strftime("%Y-%m-%d"), "$lte": today_str}, "category": {"$ne": "Rent"}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]))
            w_spent = res_w[0]["total"] if res_w else 0.0
            a_amt = allowance_doc.get("amount", 0.0)
            allowance_info = {
                "weekly_allowance": a_amt,
                "spent_this_week": w_spent,
                "remaining_balance": a_amt - w_spent,
                "safe_daily_spend": round((a_amt - w_spent) / max(1, 7 - now.weekday()), 2) if (a_amt - w_spent) > 0 else 0.0
            }

        return {
            "current_month_spending": month_total,
            "today_spending": today_total,
            "category_distribution": categories_data,
            "weekly_pocket_money": allowance_info
        }

    # 7. list_budgets
    if name == "list_budgets":
        budgets_col = get_collection("budgets")
        budgets = list(budgets_col.find({"user_id": user_id}))
        return serialize_docs(budgets)

    # 8. create_or_update_budget
    if name == "create_or_update_budget":
        budgets_col = get_collection("budgets")
        category = args.get("category", "Overall")
        amount = float(args.get("amount", 0))
        existing = budgets_col.find_one({"user_id": user_id, "category": category})
        if existing:
            budgets_col.update_one({"_id": existing["_id"]}, {"$set": {"amount": amount, "updated_at": datetime.utcnow()}})
            updated = budgets_col.find_one({"_id": existing["_id"]})
            return serialize_doc(updated)
        else:
            new_b = {"user_id": user_id, "category": category, "amount": amount, "created_at": datetime.utcnow()}
            res = budgets_col.insert_one(new_b)
            new_b["_id"] = res.inserted_id
            return serialize_doc(new_b)

    # 8b. manage_allowance
    if name == "manage_allowance":
        pm_col = get_collection("pocket_money")
        budgets_col = get_collection("budgets")
        action = args.get("action", "get")
        today_str = datetime.now().strftime("%Y-%m-%d")

        if action in ["add", "set", "deposit"]:
            if "amount" not in args or args["amount"] is None:
                raise Exception("'amount' is required when depositing pocket money")
            amt = float(args["amount"])
            start_date = (args.get("start_date") or args.get("date") or today_str).strip()
            note = args.get("notes") or args.get("note") or "From Parent"

            new_deposit = {
                "user_id": user_id,
                "user_email": user["email"],
                "amount": amt,
                "start_date": start_date,
                "note": note,
                "created_at": datetime.utcnow()
            }
            res = pm_col.insert_one(new_deposit)
            new_deposit["_id"] = res.inserted_id

            # Sync with Weekly Allowance in budgets for compatibility
            existing = budgets_col.find_one({"user_id": user_id, "category": "Weekly Allowance"})
            if existing:
                budgets_col.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"amount": amt, "notes": note, "updated_at": datetime.utcnow()}}
                )
            else:
                budgets_col.insert_one({
                    "user_id": user_id,
                    "category": "Weekly Allowance",
                    "amount": amt,
                    "period": "weekly",
                    "reset_day": "Monday",
                    "notes": note,
                    "created_at": datetime.utcnow()
                })

        elif action == "delete":
            dep_id = args.get("deposit_id") or args.get("id")
            if not dep_id:
                raise Exception("'deposit_id' is required for deleting a deposit")
            try:
                pm_col.delete_one({"_id": ObjectId(dep_id), "user_id": user_id})
            except Exception:
                pass

        # Calculate live box summary
        summary, deposits = compute_pocket_money_summary(user_id)

        avail = summary["available_balance"]
        act_dep = summary["total_active_deposited"]
        wait_dep = summary["total_waiting_deposited"]
        spent = summary["total_spent"]
        is_over = summary["is_over_budget"]

        status_msg = (
            f"Pocket Money Box: ₹{avail:,.2f} available. "
            f"Active deposits: ₹{act_dep:,.2f}, Spent: ₹{spent:,.2f}. "
            + (f"Waiting / Upcoming deposits: ₹{wait_dep:,.2f}." if wait_dep > 0 else "")
            if (act_dep > 0 or wait_dep > 0) else
            "No pocket money deposits found. Add pocket money using action='add', amount=X, and start_date='YYYY-MM-DD'."
        )

        return {
            "status": "success",
            "available_balance": avail,
            "total_active_deposited": act_dep,
            "total_waiting_deposited": wait_dep,
            "total_spent": spent,
            "is_over_budget": is_over,
            "active_deposits_count": summary["active_count"],
            "waiting_deposits_count": summary["waiting_count"],
            "deposits": serialize_docs(deposits),
            "message": status_msg
        }

    # 9. list_savings_goals
    if name == "list_savings_goals":
        savings_col = get_collection("savings")
        goals = list(savings_col.find({"user_id": user_id}))
        return serialize_docs(goals)

    # 10. record_daily_profit
    if name == "record_daily_profit":
        date = args.get("date")
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        if "amount" not in args or args["amount"] is None:
            raise Exception("'amount' is required for record_daily_profit")
        amount = float(args["amount"])
        note = args.get("note", "")
        result = profit_service.record_profit(user_id=user_id, date=date, amount=amount, note=note)
        action = result.get("action", "recorded")
        result["message"] = f"Profit {action} for {date}: {amount}"
        return result

    # 11. get_daily_profit
    if name == "get_daily_profit":
        date = args.get("date")
        if not date:
            raise Exception("'date' is required (YYYY-MM-DD)")
        res = profit_service.get_profit_by_date(user_id=user_id, date=date)
        if not res:
            return {"found": False, "message": f"No daily profit record found for {date}"}
        res["found"] = True
        return res

    # 12. list_daily_profits
    if name == "list_daily_profits":
        now = datetime.utcnow()
        start_date = args.get("start_date") or datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
        end_date = args.get("end_date") or now.strftime("%Y-%m-%d")
        records = profit_service.list_profits(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        return {"records": records, "count": len(records), "start_date": start_date, "end_date": end_date}

    # 13. get_profit_summary
    if name == "get_profit_summary":
        now = datetime.utcnow()
        start_date = args.get("start_date") or datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
        end_date = args.get("end_date") or now.strftime("%Y-%m-%d")
        return profit_service.get_summary(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )

    # 14. update_daily_profit
    if name == "update_daily_profit":
        key = args.get("id") or args.get("date")
        if not key:
            raise Exception("Must provide 'id' or 'date' to update daily profit record")
        amount = float(args["amount"]) if "amount" in args and args["amount"] is not None else None
        note = args.get("note")
        result = profit_service.update_profit(user_id=user_id, key=key, amount=amount, note=note)
        result["message"] = f"Profit record updated for {result.get('date', key)}"
        return result

    # 15. delete_daily_profit
    if name == "delete_daily_profit":
        key = args.get("id") or args.get("date")
        if not key:
            raise Exception("Must provide 'id' or 'date' to delete daily profit record")
        deleted = profit_service.delete_profit(user_id=user_id, key=key)
        if not deleted:
            raise Exception(f"Daily profit record not found for '{key}' or unauthorized")
        return {"status": "success", "deleted_key": key, "message": f"Daily profit record for '{key}' deleted successfully"}

    raise Exception(f"Unknown MCP tool: {name}")
