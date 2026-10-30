
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    DateTime,
    JSON,
    ForeignKey,
)
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Complaint(Base):
    __tablename__ = "complaints"

    # Primary identifiers
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tracking_id = Column(String(50), unique=True, nullable=False, index=True)

    # Citizen submission
    description = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    category = Column(String(100), nullable=False)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(300), nullable=False)

    # AI analysis
    ai_summary = Column(Text, nullable=True)
    ai_category = Column(String(100), nullable=True)
    priority_score = Column(Integer, nullable=True)
    priority_level = Column(String(30), nullable=True)
    priority_reasons = Column(JSON, nullable=True)

    # Duplicate detection
    duplicate_of = Column(
        String(36),
        ForeignKey("complaints.id"),
        nullable=True
    )
    similarity_score = Column(Float, nullable=True)

    # Geographic intelligence
    cluster_id = Column(String(50), nullable=True)

    # Action workflow
    status = Column(
        String(30),
        nullable=False,
        default="Submitted"
    )
    assigned_department = Column(String(150), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
