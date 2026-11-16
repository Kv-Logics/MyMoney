import pytest
from datetime import datetime, timedelta
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_collection
from app.auth import JWT_SECRET, JWT_ALGORITHM, hash_password
from bson import ObjectId

client = TestClient(app)

def create_test_token(email: str):
    payload = {
        "email": email,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def test_delete_account_and_admin_delete():
    users_col = get_collection("users")
    expenses_col = get_collection("expenses")
    budgets_col = get_collection("budgets")
    
    # 1. Create a dummy regular user
    test_email = "delete_me_test@example.com"
    users_col.delete_many({"email": test_email})
    
    hashed = hash_password("secret123")
    user_res = users_col.insert_one({
        "name": "Delete Tester",
        "email": test_email,
        "password": hashed,
        "currency": "INR",
        "created_at": datetime.utcnow()
    })
    user_id = str(user_res.inserted_id)
    
    # Add dummy expense and budget for this user
    expenses_col.insert_one({
        "user_id": user_id,
        "amount": 150.0,
        "title": "Test Milk",
        "category": "Food",
        "payment_method": "UPI",
        "date": "2026-11-16"
    })
    budgets_col.insert_one({
        "user_id": user_id,
        "category": "Food",
        "amount": 5000.0
    })
    
    user_token = create_test_token(test_email)
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Test 1: Self delete with wrong password fails
    bad_res = client.request(
        "DELETE",
        "/api/auth/delete-account",
        headers=headers,
        json={"password": "wrong_password"}
    )
    assert bad_res.status_code == 400
    assert "Incorrect password" in bad_res.json()["detail"]
    assert users_col.find_one({"_id": ObjectId(user_id)}) is not None
    
    # Test 2: Self delete with correct password succeeds
    del_res = client.request(
        "DELETE",
        "/api/auth/delete-account",
        headers=headers,
        json={"password": "secret123"}
    )
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"
    
    # Verify user and related data are completely removed
    assert users_col.find_one({"_id": ObjectId(user_id)}) is None
    assert expenses_col.find_one({"user_id": user_id}) is None
    assert budgets_col.find_one({"user_id": user_id}) is None
    
    # Test 3: Admin delete user
    # Create target user
    target_email = "admin_del_target@example.com"
    users_col.delete_many({"email": target_email})
    target_res = users_col.insert_one({
        "name": "Target For Admin",
        "email": target_email,
        "password": hash_password("pass123"),
        "currency": "INR",
        "created_at": datetime.utcnow()
    })
    target_id = str(target_res.inserted_id)
    
    expenses_col.insert_one({
        "user_id": target_id,
        "amount": 99.0,
        "title": "Chai",
        "category": "Food",
        "payment_method": "Cash",
        "date": "2026-11-16"
    })
    
    admin_token = create_test_token("keerthivasan.220722@gmail.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Non-admin cannot delete
    non_admin_email = "regular_non_admin@example.com"
    users_col.delete_many({"email": non_admin_email})
    users_col.insert_one({
        "name": "Regular User",
        "email": non_admin_email,
        "password": hash_password("pass123"),
        "currency": "INR",
        "created_at": datetime.utcnow()
    })
    non_admin_token = create_test_token(non_admin_email)
    forbidden_res = client.delete(
        f"/api/auth/admin/users/{target_id}",
        headers={"Authorization": f"Bearer {non_admin_token}"}
    )
    assert forbidden_res.status_code == 403
    
    # Admin can delete target user
    adm_del_res = client.delete(
        f"/api/auth/admin/users/{target_id}",
        headers=admin_headers
    )
    assert adm_del_res.status_code == 200
    assert adm_del_res.json()["status"] == "success"
    assert users_col.find_one({"_id": ObjectId(target_id)}) is None
    assert expenses_col.find_one({"user_id": target_id}) is None
    
    # Test 4: Cannot delete admin accounts
    admin_user = users_col.find_one({"email": "keerthivasan.220722@gmail.com"})
    if admin_user:
        admin_del_admin_res = client.delete(
            f"/api/auth/admin/users/{str(admin_user['_id'])}",
            headers=admin_headers
        )
        assert admin_del_admin_res.status_code == 400
        assert "Cannot delete a system administrator account" in admin_del_admin_res.json()["detail"]
