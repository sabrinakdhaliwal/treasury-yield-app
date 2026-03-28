"""
Treasury Yield Curve & Liquidity Order Management API

Entry point — initializes the app, registers middleware and routes.
Business logic lives in routes.py, yields.py, db.py, and models.py.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db
from routes import router

app = FastAPI(title="Treasury Yield Curve API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
init_db()

# Register all routes
app.include_router(router)
