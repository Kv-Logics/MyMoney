import hashlib
import base64
import secrets
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

ISSUER = "https://mymoney-jd0n.onrender.com"
RESOURCE_URI = "https://mymoney-jd0n.onrender.com"

def generate_pkce():
    code_verifier = secrets.token_urlsafe(32)
    digest = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")
    return code_verifier, code_challenge

def test_oauth_metadata_discovery():
    # 1. Protected Resource Metadata (RFC 9728)
    res_prot = client.get("/.well-known/oauth-protected-resource")
    assert res_prot.status_code == 200
    data_prot = res_prot.json()
    assert data_prot["resource"] == RESOURCE_URI
    assert ISSUER in data_prot["authorization_servers"]

    # 2. Authorization Server Metadata (RFC 8414)
    res_srv = client.get("/.well-known/oauth-authorization-server")
    assert res_srv.status_code == 200
    data_srv = res_srv.json()
    assert data_srv["issuer"] == ISSUER
    assert data_srv["authorization_response_iss_parameter_supported"] is True
    assert data_srv["client_id_metadata_document_supported"] is True
    assert "S256" in data_srv["code_challenge_methods_supported"]

def test_full_oauth_pkce_flow_and_mcp_tools():
    # 1. Register test user
    user_data = {
        "name": "MCP Tester",
        "email": "mcp_test_user_full@example.com",
        "password": "Password123!"
    }
    client.post("/api/auth/register", json=user_data)

    # Generate PKCE verifier and challenge
    verifier, challenge = generate_pkce()

    # 2. GET /oauth/authorize page
    res_auth_page = client.get(
        f"/oauth/authorize?response_type=code&client_id=https://chatgpt.com/oauth/client.json"
        f"&redirect_uri=https://chatgpt.com/connector_platform_oauth_redirect"
        f"&code_challenge={challenge}&code_challenge_method=S256&resource={RESOURCE_URI}&state=xyz123"
    )
    assert res_auth_page.status_code == 200
    assert "Authorize ChatGPT" in res_auth_page.text

    # 3. POST /oauth/authorize consent login
    res_auth_post = client.post(
        "/oauth/authorize",
        data={
            "email": user_data["email"],
            "password": user_data["password"],
            "client_id": "https://chatgpt.com/oauth/client.json",
            "redirect_uri": "https://chatgpt.com/connector_platform_oauth_redirect",
            "state": "xyz123",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "resource": RESOURCE_URI
        },
        follow_redirects=False
    )
    assert res_auth_post.status_code == 302
    redirect_location = res_auth_post.headers["location"]
    assert f"iss={ISSUER}" in redirect_location
    assert "state=xyz123" in redirect_location
    assert "code=" in redirect_location

    # Extract auth_code from location URL
    auth_code = redirect_location.split("code=")[1].split("&")[0]

    # 4. Exchange code for token with valid PKCE verifier
    res_token = client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": "https://chatgpt.com/connector_platform_oauth_redirect",
            "client_id": "https://chatgpt.com/oauth/client.json",
            "code_verifier": verifier,
            "resource": RESOURCE_URI
        }
    )
    assert res_token.status_code == 200
    token_data = res_token.json()
    assert token_data["token_type"] == "Bearer"
    assert "access_token" in token_data
    access_token = token_data["access_token"]

    # 5. MCP Protocol: initialize
    res_init = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert res_init.status_code == 200
    assert res_init.json()["result"]["serverInfo"]["name"] == "mymoney-mcp"

    # 6. MCP Protocol: tools/list
    res_tools = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    assert res_tools.status_code == 200
    tools = res_tools.json()["result"]["tools"]
    tool_names = [t["name"] for t in tools]
    assert "get_user_profile" in tool_names
    assert "list_expenses" in tool_names
    assert "create_expense" in tool_names

    # Verify securitySchemes present on every tool
    for t in tools:
        assert "securitySchemes" in t
        assert t["securitySchemes"][0]["type"] == "oauth2"

    # 7. Unauthenticated MCP tools/call should return 401 & challenge metadata
    res_unauth = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "get_user_profile", "arguments": {}}
        }
    )
    assert res_unauth.status_code == 401
    assert "WWW-Authenticate" in res_unauth.headers
    assert "resource_metadata" in res_unauth.headers["WWW-Authenticate"]
    assert "mcp/www_authenticate" in res_unauth.json()["error"]["data"]["_meta"]

    # 8. Authenticated MCP call: get_user_profile
    headers = {"Authorization": f"Bearer {access_token}"}
    res_profile = client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {"name": "get_user_profile", "arguments": {}}
        }
    )
    assert res_profile.status_code == 200
    prof_text = res_profile.json()["result"]["content"][0]["text"]
    assert "MCP Tester" in prof_text

    # 9. Authenticated MCP call: create_expense
    res_create = client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {
                "name": "create_expense",
                "arguments": {
                    "title": "MCP Dinner",
                    "amount": 350.0,
                    "category": "Food",
                    "payment_method": "UPI",
                    "date": "2026-10-02"
                }
            }
        }
    )
    assert res_create.status_code == 200
    assert "MCP Dinner" in res_create.json()["result"]["content"][0]["text"]

    # 10. Authenticated MCP call: list_expenses
    res_list = client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 6,
            "method": "tools/call",
            "params": {"name": "list_expenses", "arguments": {}}
        }
    )
    assert res_list.status_code == 200
    assert "MCP Dinner" in res_list.json()["result"]["content"][0]["text"]

    # 11. Authenticated MCP call: get_expense_summary
    res_summary = client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 7,
            "method": "tools/call",
            "params": {"name": "get_expense_summary", "arguments": {}}
        }
    )
    assert res_summary.status_code == 200
    assert "current_month_spending" in res_summary.json()["result"]["content"][0]["text"]
