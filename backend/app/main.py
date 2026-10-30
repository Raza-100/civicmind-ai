
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.complaint import Complaint
from app.api.complaints import router as complaints_router


# Create database tables
Base.metadata.create_all(bind=engine)


# Initialize FastAPI application
app = FastAPI(
    title="CivicMind AI",
    description="AI-powered civic complaint intelligence platform",
    version="1.0.0"
)


# ==========================================
# CORS CONFIGURATION
# Allow React frontend to communicate with API
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
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
        "message": "Civic intelligence backend is running!"
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

    from sqlalchemy import text

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "database": "connected",
        "status": "healthy"
    }
