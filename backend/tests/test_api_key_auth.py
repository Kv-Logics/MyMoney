import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token, hash_api_key, generate_api_key

client = TestClient(app)

def test_api_key_lifecycle_and_authentication():
    # 1. Register two isolated test users
    user_a = {
        "name": "User A",
        "email": "user_a_test_apikey@example.com",
        "password": "password123"
    }
    user_b = {
        "name": "User B",
        "email": "user_b_test_apikey@example.com",
        "password": "password123"
    }
    
    # Register User A
    res_reg_a = client.post("/api/auth/register", json=user_a)
    token_a = res_reg_a.json().get("access_token") if res_reg_a.status_code == 200 else None
    if not token_a:
        res_login_a = client.post("/api/auth/login", json={"email": user_a["email"], "password": user_a["password"]})
        token_a = res_login_a.json()["access_token"]

    # Register User B
    res_reg_b = client.post("/api/auth/register", json=user_b)
    token_b = res_reg_b.json().get("access_token") if res_reg_b.status_code == 200 else None
    if not token_b:
        res_login_b = client.post("/api/auth/login", json={"email": user_b["email"], "password": user_b["password"]})
        token_b = res_login_b.json()["access_token"]

    # 2. Test JWT authentication still works
    res_me_jwt = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert res_me_jwt.status_code == 200
    assert res_me_jwt.json()["email"] == user_a["email"]

    # 3. Generate API Key for User A using JWT auth
    res_gen_key = client.post("/api/auth/api-key", headers={"Authorization": f"Bearer {token_a}"}, json={"days_valid": 30})
    assert res_gen_key.status_code == 200
    data = res_gen_key.json()
    raw_api_key = data["api_key"]
    assert raw_api_key.startswith("mm_live_")
    assert data["is_active"] is True

    # 4. Authenticate using the newly generated API Key
    res_me_apikey = client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_api_key}"})
    assert res_me_apikey.status_code == 200
    assert res_me_apikey.json()["email"] == user_a["email"]

    # 5. User Isolation test: Create expense under User A using API Key
    expense_data = {
        "title": "Secret Coffee A",
        "amount": 120.0,
        "category": "Food",
        "payment_method": "UPI",
        "date": "2026-10-02"
    }
    res_create_exp = client.post("/api/expenses", headers={"Authorization": f"Bearer {raw_api_key}"}, json=expense_data)
    assert res_create_exp.status_code == 200

    # User B should NOT see User A's expense
    res_b_expenses = client.get("/api/expenses", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b_expenses.status_code == 200
    b_expense_titles = [e["title"] for e in res_b_expenses.json()]
    assert "Secret Coffee A" not in b_expense_titles

    # User A CAN see their expense using API key
    res_a_expenses = client.get("/api/expenses", headers={"Authorization": f"Bearer {raw_api_key}"})
    assert res_a_expenses.status_code == 200
    a_expense_titles = [e["title"] for e in res_a_expenses.json()]
    assert "Secret Coffee A" in a_expense_titles

    # 6. Test invalid API Key
    res_invalid = client.get("/api/auth/me", headers={"Authorization": "Bearer mm_live_invalidkey1234567890"})
    assert res_invalid.status_code == 401

    # 7. Test Revoking API Key
    res_revoke = client.delete("/api/auth/api-key", headers={"Authorization": f"Bearer {token_a}"})
    assert res_revoke.status_code == 200

    # Key should no longer authenticate
    res_revoked_auth = client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_api_key}"})
    assert res_revoked_auth.status_code == 401
