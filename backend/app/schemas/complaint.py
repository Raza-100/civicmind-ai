from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class ComplaintCreate(BaseModel):
    description: str = Field(min_length=10)
    category: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: str
    image_url: Optional[str] = None


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tracking_id: str
    description: str
    category: str
    latitude: float
    longitude: float
    address: str
    status: str
    assigned_department: Optional[str] = None