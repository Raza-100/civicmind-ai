
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any


# ==========================================
# 1. CITIZEN COMPLAINT SUBMISSION
# ==========================================

class ComplaintCreate(BaseModel):
    description: str = Field(min_length=10)
    category: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: str
    image_url: Optional[str] = None


# ==========================================
# 2. COMPLAINT RESPONSE
# ==========================================

class ComplaintResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    # Basic information
    id: str
    tracking_id: str
    description: str
    category: str

    # Location
    latitude: float
    longitude: float
    address: str

    # Workflow
    status: str
    assigned_department: Optional[str] = None

    # AI categorization
    ai_category: Optional[str] = None
    ai_summary: Optional[str] = None

    # Explainable priority
    priority_score: Optional[int] = None
    priority_level: Optional[str] = None
    priority_reasons: Optional[Any] = None

    # Duplicate detection
    duplicate_of: Optional[str] = None
    similarity_score: Optional[float] = None

    # Image
    image_url: Optional[str] = None
