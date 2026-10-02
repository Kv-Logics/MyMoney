import hashlib
import base64
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Form, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from bson import ObjectId
import jwt

from app.database import get_collection
from app.auth import (
    verify_password,
    JWT_SECRET,
    JWT_ALGORITHM,
    create_access_token,
    get_current_user
)

router = APIRouter(tags=["OAuth 2.1 & Discovery"])

ISSUER = "https://mymoney-jd0n.onrender.com"
RESOURCE_URI = "https://mymoney-jd0n.onrender.com"
ALLOWED_CLIENT_IDS = [
    "https://chatgpt.com/oauth/client.json",
    "chatgpt-client"
]
ALLOWED_REDIRECT_URIS = [
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "https://oauth.pstmn.io/v1/callback"
]

def verify_pkce(code_verifier: str, code_challenge: str, code_challenge_method: str = "S256") -> bool:
    if not code_challenge:
        return True
    if code_challenge_method == "plain":
        return code_verifier == code_challenge
    elif code_challenge_method == "S256":
        digest = hashlib.sha256(code_verifier.encode("utf-8")).digest()
        calculated = base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")
        target = code_challenge.rstrip("=")
        return calculated == target
    return False

# --- 1. RFC 9728 Protected Resource Metadata ---
@router.get("/.well-known/oauth-protected-resource")
def get_oauth_protected_resource():
    return {
        "resource": RESOURCE_URI,
        "authorization_servers": [
            ISSUER
        ],
        "scopes_supported": [
            "profile:read",
            "expenses:read",
            "expenses:write",
            "budgets:read",
            "budgets:write",
            "savings:read",
            "profit:read",
            "profit:write"
        ],
        "bearer_methods_supported": [
            "header"
        ],
        "resource_documentation": f"{ISSUER}/docs"
    }

# --- 2. RFC 8414 Authorization Server Metadata ---
@router.get("/.well-known/oauth-authorization-server")
def get_oauth_authorization_server():
    return {
        "issuer": ISSUER,
        "authorization_response_iss_parameter_supported": True,
        "authorization_endpoint": f"{ISSUER}/oauth/authorize",
        "token_endpoint": f"{ISSUER}/oauth/token",
        "client_id_metadata_document_supported": True,
        "token_endpoint_auth_methods_supported": ["none"],
        "code_challenge_methods_supported": ["S256"],
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "scopes_supported": [
            "profile:read",
            "expenses:read",
            "expenses:write",
            "budgets:read",
            "budgets:write",
            "savings:read",
            "profit:read",
            "profit:write"
        ],
        "resource_indicators_supported": True
    }

# --- 3. OAuth 2.1 Consent Form (GET) ---
@router.get("/oauth/authorize", response_class=HTMLResponse)
def oauth_authorize_page(
    response_type: str = "code",
    client_id: Optional[str] = "https://chatgpt.com/oauth/client.json",
    redirect_uri: str = "https://chatgpt.com/connector_platform_oauth_redirect",
    scope: Optional[str] = "profile:read expenses:read expenses:write budgets:read budgets:write savings:read",
    state: Optional[str] = "",
    code_challenge: Optional[str] = "",
    code_challenge_method: Optional[str] = "S256",
    resource: Optional[str] = RESOURCE_URI
):
    # Validate resource if passed
    if resource and resource.rstrip("/") != RESOURCE_URI.rstrip("/"):
        err_sep = "&" if "?" in redirect_uri else "?"
        error_url = f"{redirect_uri}{err_sep}error=invalid_target&error_description=Invalid+resource+indicator&iss={ISSUER}&state={state}"
        return RedirectResponse(url=error_url, status_code=302)

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authorize ChatGPT — MyMoney</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
            }}
            .card {{
                background: white;
                padding: 2.5rem;
                border-radius: 1rem;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                width: 100%;
                max-width: 400px;
            }}
            .logo {{
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1.5rem;
            }}
            .logo-icon {{
                background: #10b981;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 1.25rem;
            }}
            h2 {{ margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1.5rem; }}
            p {{ color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; line-height: 1.4; }}
            .form-group {{ margin-bottom: 1rem; }}
            label {{ display: block; font-size: 0.875rem; font-weight: 500; color: #334155; margin-bottom: 0.375rem; }}
            input {{
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #cbd5e1;
                border-radius: 0.5rem;
                box-sizing: border-box;
                font-size: 0.95rem;
            }}
            input:focus {{ border-color: #10b981; outline: none; ring: 2px #10b981; }}
            button {{
                width: 100%;
                background: #10b981;
                color: white;
                border: none;
                padding: 0.85rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                margin-top: 1rem;
                transition: background 0.2s;
            }}
            button:hover {{ background: #059669; }}
            .footer-note {{ margin-top: 1.5rem; text-align: center; font-size: 0.75rem; color: #94a3b8; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">
                <div class="logo-icon">M</div>
                <div style="font-weight: 700; font-size: 1.25rem; color: #0f172a;">MyMoney</div>
            </div>
            <h2>Connect ChatGPT</h2>
            <p>Log in with your MyMoney account to grant ChatGPT access to manage expenses & budgets.</p>
            <form action="/oauth/authorize" method="POST">
                <input type="hidden" name="client_id" value="{client_id}">
                <input type="hidden" name="redirect_uri" value="{redirect_uri}">
                <input type="hidden" name="state" value="{state}">
                <input type="hidden" name="scope" value="{scope}">
                <input type="hidden" name="code_challenge" value="{code_challenge}">
                <input type="hidden" name="code_challenge_method" value="{code_challenge_method}">
                <input type="hidden" name="resource" value="{resource}">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" required placeholder="user@example.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required placeholder="••••••••">
                </div>
                <button type="submit">Authorize Connection</button>
            </form>
            <div class="footer-note">RFC 9728 & OAuth 2.1 Protected • S256 PKCE Enabled</div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# --- 4. OAuth 2.1 Authorization Code Issuance (POST) ---
@router.post("/oauth/authorize")
def handle_oauth_authorize(
    email: str = Form(...),
    password: str = Form(...),
    client_id: str = Form("https://chatgpt.com/oauth/client.json"),
    redirect_uri: str = Form("https://chatgpt.com/connector_platform_oauth_redirect"),
    state: str = Form(""),
    scope: str = Form("profile:read expenses:read expenses:write budgets:read budgets:write savings:read"),
    code_challenge: str = Form(""),
    code_challenge_method: str = Form("S256"),
    resource: str = Form(RESOURCE_URI)
):
    sep = "&" if "?" in redirect_uri else "?"
    
    # Validate resource
    if resource and resource.rstrip("/") != RESOURCE_URI.rstrip("/"):
        error_url = f"{redirect_uri}{sep}error=invalid_target&error_description=Invalid+resource+indicator&iss={ISSUER}&state={state}"
        return RedirectResponse(url=error_url, status_code=302)

    users_col = get_collection("users")
    user = users_col.find_one({"email": email})
    if not user or not verify_password(password, user.get("password", "")):
        error_url = f"{redirect_uri}{sep}error=access_denied&error_description=Invalid+credentials&iss={ISSUER}&state={state}"
        return RedirectResponse(url=error_url, status_code=302)

    auth_code = f"mcpc_{secrets.token_hex(20)}"
    auth_codes_col = get_collection("auth_codes")
    auth_codes_col.insert_one({
        "auth_code": auth_code,
        "user_id": str(user["_id"]),
        "user_email": user["email"],
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "resource": resource or RESOURCE_URI,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    })

    # ALWAYS include iss=https://mymoney-jd0n.onrender.com in the redirect response
    target_url = f"{redirect_uri}{sep}code={auth_code}&state={state}&iss={ISSUER}"
    return RedirectResponse(url=target_url, status_code=302)

# --- 5. OAuth 2.1 Token Exchange (POST /oauth/token) ---
@router.post("/oauth/token")
async def oauth_token_endpoint(request: Request):
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
    else:
        form = await request.form()
        body = dict(form)

    code = body.get("code")
    code_verifier = body.get("code_verifier", "")
    resource_req = body.get("resource")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    auth_codes_col = get_collection("auth_codes")
    record = auth_codes_col.find_one({"auth_code": code})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired authorization code")

    if record.get("expires_at") and record["expires_at"] < datetime.utcnow():
        auth_codes_col.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Authorization code expired")

    # Validate resource indicator if present
    if resource_req and resource_req.rstrip("/") != RESOURCE_URI.rstrip("/"):
        raise HTTPException(status_code=400, detail="Resource parameter mismatch")

    # Validate PKCE S256
    stored_challenge = record.get("code_challenge", "")
    challenge_method = record.get("code_challenge_method", "S256")
    if stored_challenge and code_verifier:
        if not verify_pkce(code_verifier, stored_challenge, challenge_method):
            raise HTTPException(status_code=400, detail="PKCE verifier verification failed")

    # Invalidate authorization code once used
    auth_codes_col.delete_one({"_id": record["_id"]})

    users_col = get_collection("users")
    user = users_col.find_one({"_id": ObjectId(record["user_id"])})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    scope = record.get("scope", "profile:read expenses:read expenses:write budgets:read budgets:write savings:read")
    
    # Issue audience-bound OAuth Access Token with sub, iss, aud, exp, scope claims
    now = datetime.utcnow()
    expires_delta = timedelta(days=1)
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", "User"),
        "iss": ISSUER,
        "aud": RESOURCE_URI,
        "scope": scope,
        "token_type": "mcp_oauth_token",
        "iat": now,
        "exp": now + expires_delta
    }
    
    access_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": 86400,
        "scope": scope
    }
