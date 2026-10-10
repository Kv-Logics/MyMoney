import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import (
    auth,
    categories,
    payment_methods,
    sharing,
    budgets,
    expenses,
    savings,
    misc,
    tasks,
    ai,
    oauth,
    profit,
    push
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MyMoney - Expense Tracker API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    response = JSONResponse(
        status_code=500,
        content={"detail": f"An unexpected error occurred: {str(exc)}"}
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Root endpoint
@app.get("/")
def read_root():
    return {"status": "ok", "message": "MyMoney - Expense Tracker API is running"}

# Include Modular Routers
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(payment_methods.router)
app.include_router(sharing.router)
app.include_router(budgets.router)
app.include_router(expenses.router)
app.include_router(savings.router)
app.include_router(misc.router)
app.include_router(tasks.router)
app.include_router(ai.router)
app.include_router(oauth.router)
app.include_router(mcp.router)
app.include_router(profit.router)
app.include_router(push.router)

# Mount receipt uploads folder statically
upload_dir = "/home/kv/Projects/MyMoney/backend/uploads"
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
