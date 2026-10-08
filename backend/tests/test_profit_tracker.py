import secrets
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token

client = TestClient(app)

ISSUER = "https://mymoney-jd0n.onrender.com"

def test_profit_tracker_complete_lifecycle():
    # 1. Register two isolated test users
    user_a = {"name": "Profit User A", "email": "profit_user_a@example.com", "password": "Password123!"}
    user_b = {"name": "Profit User B", "email": "profit_user_b@example.com", "password": "Password123!"}

    client.post("/api/auth/register", json=user_a)
    client.post("/api/auth/register", json=user_b)

    # Get User A ID
    users_col = app.state if hasattr(app, 'state') else None
    from app.database import get_collection
    user_a_doc = get_collection("users").find_one({"email": user_a["email"]})
    user_b_doc = get_collection("users").find_one({"email": user_b["email"]})

    # Create OAuth access tokens
    import jwt
    from app.auth import JWT_SECRET, JWT_ALGORITHM
    from datetime import datetime, timedelta

    token_a = jwt.encode({
        "sub": str(user_a_doc["_id"]),
        "email": user_a["email"],
        "iss": ISSUER,
        "aud": ISSUER,
        "scope": "profit:read profit:write",
        "exp": datetime.utcnow() + timedelta(days=1)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    token_b = jwt.encode({
        "sub": str(user_b_doc["_id"]),
        "email": user_b["email"],
        "iss": ISSUER,
        "aud": ISSUER,
        "scope": "profit:read profit:write",
        "exp": datetime.utcnow() + timedelta(days=1)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. Record Positive Profit (Day 1: ₹350)
    res1 = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "record_daily_profit",
                "arguments": {"date": "2026-10-01", "amount": 350.0, "note": "Good sales"}
            }
        }
    )
    assert res1.status_code == 200
    assert "350" in res1.json()["result"]["content"][0]["text"]

    # 3. Record Duplicate Date Update (Day 1 updated to ₹450)
    res1_up = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "record_daily_profit",
                "arguments": {"date": "2026-10-01", "amount": 450.0, "note": "Updated evening sales"}
            }
        }
    )
    assert res1_up.status_code == 200
    assert "450" in res1_up.json()["result"]["content"][0]["text"]

    # 4. Record Zero Profit (Day 2: ₹0)
    res2 = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "record_daily_profit",
                "arguments": {"date": "2026-10-02", "amount": 0.0, "note": "Shop closed"}
            }
        }
    )
    assert res2.status_code == 200

    # 5. Record Negative/Loss Amount (Day 3: -₹200)
    res3 = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "record_daily_profit",
                "arguments": {"date": "2026-10-03", "amount": -200.0, "note": "Equipment repair expense"}
            }
        }
    )
    assert res3.status_code == 200

    # 6. Record Another Profitable Day (Day 4: ₹750)
    res4 = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {
                "name": "record_daily_profit",
                "arguments": {"date": "2026-10-04", "amount": 750.0, "note": "Festival bonus sales"}
            }
        }
    )
    assert res4.status_code == 200

    # 7. Test get_daily_profit for specific date
    res_get = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 6,
            "method": "tools/call",
            "params": {
                "name": "get_daily_profit",
                "arguments": {"date": "2026-10-01"}
            }
        }
    )
    assert res_get.status_code == 200
    assert "450" in res_get.json()["result"]["content"][0]["text"]

    # 8. Test list_daily_profits
    res_list = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 7,
            "method": "tools/call",
            "params": {
                "name": "list_daily_profits",
                "arguments": {"start_date": "2026-10-01", "end_date": "2026-10-05"}
            }
        }
    )
    assert res_list.status_code == 200
    import json
    daily_items = json.loads(res_list.json()["result"]["content"][0]["text"])
    assert len(daily_items) == 4  # Ensure single unique record per date

    # 9. Test get_profit_summary metrics
    res_sum = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 8,
            "method": "tools/call",
            "params": {
                "name": "get_profit_summary",
                "arguments": {"start_date": "2026-10-01", "end_date": "2026-10-05"}
            }
        }
    )
    assert res_sum.status_code == 200
    summary = json.loads(res_sum.json()["result"]["content"][0]["text"])

    # Expected calculations:
    # Amounts: 450, 0, -200, 750
    # Total profit: 450 + 0 - 200 + 750 = 1000.0
    # Profitable days (> 0): 2 (450, 750)
    # No profit days (== 0): 1 (0)
    # Loss days (< 0): 1 (-200)
    # Average profit on profitable days: (450 + 750) / 2 = 600.0
    # Highest profit: 750.0
    # Lowest profit: -200.0

    assert summary["total_profit"] == 1000.0
    assert summary["profitable_days"] == 2
    assert summary["no_profit_days"] == 1
    assert summary["loss_days"] == 1
    assert summary["average_profit_on_profitable_days"] == 600.0
    assert summary["highest_profit"] == 750.0
    assert summary["lowest_profit"] == -200.0

    # 10. Test User Isolation: User B must NOT see User A's profit records
    res_b_list = client.post(
        "/mcp",
        headers=headers_b,
        json={
            "jsonrpc": "2.0",
            "id": 9,
            "method": "tools/call",
            "params": {
                "name": "list_daily_profits",
                "arguments": {}
            }
        }
    )
    assert res_b_list.status_code == 200
    b_items = json.loads(res_b_list.json()["result"]["content"][0]["text"])
    assert len(b_items["records"]) == 0

    # 11. Test delete_daily_profit
    res_del = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 10,
            "method": "tools/call",
            "params": {
                "name": "delete_daily_profit",
                "arguments": {"date": "2026-10-02"}
            }
        }
    )
    assert res_del.status_code == 200

    # Verify deleted record is gone
    res_sum_after = client.post(
        "/mcp",
        headers=headers_a,
        json={
            "jsonrpc": "2.0",
            "id": 11,
            "method": "tools/call",
            "params": {
                "name": "get_profit_summary",
                "arguments": {"start_date": "2026-10-01", "end_date": "2026-10-05"}
            }
        }
    )
    summary_after = json.loads(res_sum_after.json()["result"]["content"][0]["text"])
    assert summary_after["no_profit_days"] == 0
