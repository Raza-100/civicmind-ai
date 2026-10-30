
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.complaint import Complaint
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse
)
from app.services.priority import calculate_priority


router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"]
)


# ==========================================
# 1. CREATE A NEW CIVIC COMPLAINT
# ==========================================

@router.post(
    "/",
    response_model=ComplaintResponse,
    status_code=201
)
def create_complaint(
    complaint_data: ComplaintCreate,
    db: Session = Depends(get_db)
):
    try:
        complaint = Complaint(
            tracking_id=f"CIV-{uuid.uuid4().hex[:8].upper()}",
            description=complaint_data.description,
            category=complaint_data.category,
            latitude=complaint_data.latitude,
            longitude=complaint_data.longitude,
            address=complaint_data.address,
            image_url=complaint_data.image_url,
            status="Submitted"
        )

        db.add(complaint)
        db.commit()
        db.refresh(complaint)

        return complaint

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# 2. GET ALL CIVIC COMPLAINTS
# ==========================================

@router.get(
    "/",
    response_model=list[ComplaintResponse]
)
def get_complaints(
    db: Session = Depends(get_db)
):
    return (
        db.query(Complaint)
        .order_by(Complaint.created_at.desc())
        .all()
    )


# ==========================================
# 3. AI EXPLAINABLE PRIORITY ANALYSIS
# ==========================================

@router.post("/{complaint_id}/analyze")
def analyze_complaint(
    complaint_id: str,
    db: Session = Depends(get_db)
):
    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id)
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    result = calculate_priority(
        complaint.description,
        complaint.category
    )

    complaint.priority_score = result["priority_score"]
    complaint.priority_level = result["priority_level"]
    complaint.priority_reasons = result["priority_reasons"]

    db.commit()
    db.refresh(complaint)

    return {
        "tracking_id": complaint.tracking_id,
        "category": complaint.category,
        **result
    }
