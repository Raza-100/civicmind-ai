
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.complaint import Complaint
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse
)

router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"]
)


@router.post("/", response_model=ComplaintResponse, status_code=201)
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


@router.get("/", response_model=list[ComplaintResponse])
def get_complaints(db: Session = Depends(get_db)):
    return (
        db.query(Complaint)
        .order_by(Complaint.created_at.desc())
        .all()
    )
