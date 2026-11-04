
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.models.complaint import Complaint
from app.api.complaints import router as complaints_router


# ==========================================
# DATABASE INITIALIZATION
# ==========================================

Base.metadata.create_all(bind=engine)


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="CivicMind AI",
    description="AI-powered civic complaint intelligence platform",
    version="1.0.0"
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

# Local development URLs
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

# Production frontend URL from Render environment
frontend_url = os.getenv("FRONTEND_URL", "")

# Support multiple frontend URLs separated by commas
if frontend_url:
    production_origins = [
        url.strip().rstrip("/")
        for url in frontend_url.split(",")
        if url.strip()
    ]

    allowed_origins.extend(production_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# REGISTER API ROUTES
# ==========================================

app.include_router(complaints_router)


# ==========================================
# ROOT ENDPOINT
# ==========================================

@app.get("/")
def root():
    return {
        "project": "CivicMind AI",
        "message": "Civic intelligence backend is running!",
        "version": "1.0.0"
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "CivicMind API"
    }


# ==========================================
# DATABASE HEALTH CHECK
# ==========================================

@app.get("/database-health")
def database_health():

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "database": "connected",
        "status": "healthy"
    }
