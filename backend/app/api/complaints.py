
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.complaint import Complaint

from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse
)

# AI Services
from app.services.priority import calculate_priority
from app.services.categorizer import categorize_complaint
from app.services.duplicate import detect_duplicate
from app.services.clustering import cluster_complaints


router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"]
)


# ==========================================
# 1. CREATE A NEW CIVIC COMPLAINT
#    AI Categorization + Duplicate Detection
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

        # STEP 1: Automatically categorize complaint
        ai_result = categorize_complaint(
            complaint_data.description
        )

        # STEP 2: Fetch existing complaints
        existing_complaints = db.query(Complaint).all()

        # STEP 3: Detect potential duplicates
        duplicate_result = detect_duplicate(
            description=complaint_data.description,
            latitude=complaint_data.latitude,
            longitude=complaint_data.longitude,
            existing_complaints=existing_complaints
        )

        duplicate_match = duplicate_result["match"]

        duplicate_of = (
            duplicate_match["duplicate_id"]
            if duplicate_match else None
        )

        similarity_score = (
            duplicate_match["similarity_score"]
            if duplicate_match else None
        )

        # STEP 4: Create complaint record
        complaint = Complaint(
            tracking_id=f"CIV-{uuid.uuid4().hex[:8].upper()}",
            description=complaint_data.description,

            # AI categorization
            category=ai_result["category"],
            ai_category=ai_result["category"],

            # Location details
            latitude=complaint_data.latitude,
            longitude=complaint_data.longitude,
            address=complaint_data.address,
            image_url=complaint_data.image_url,

            # Department assignment
            assigned_department=ai_result["department"],

            # Duplicate detection
            duplicate_of=duplicate_of,
            similarity_score=similarity_score,

            # Initial status
            status="Submitted"
        )

        # STEP 5: Save to database
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

    # Calculate explainable priority
    result = calculate_priority(
        complaint.description,
        complaint.category
    )

    # Save AI analysis
    complaint.priority_score = result["priority_score"]
    complaint.priority_level = result["priority_level"]
    complaint.priority_reasons = result["priority_reasons"]

    db.commit()
    db.refresh(complaint)

    return {
        "tracking_id": complaint.tracking_id,
        "category": complaint.category,
        "department": complaint.assigned_department,
        **result
    }


# ==========================================
# 4. GET DUPLICATE DETECTION DETAILS
# ==========================================

@router.get("/{complaint_id}/duplicates")
def get_complaint_duplicates(
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

    if not complaint.duplicate_of:
        return {
            "tracking_id": complaint.tracking_id,
            "is_duplicate": False,
            "message": "No potential duplicate detected."
        }

    original = (
        db.query(Complaint)
        .filter(Complaint.id == complaint.duplicate_of)
        .first()
    )

    return {
        "tracking_id": complaint.tracking_id,
        "is_duplicate": True,
        "duplicate_of": complaint.duplicate_of,
        "original_tracking_id": (
            original.tracking_id if original else None
        ),
        "similarity_score": complaint.similarity_score,
        "message": "Potential duplicate complaint detected."
    }


# ==========================================
# 5. GEOGRAPHIC HOTSPOT DETECTION
# ==========================================

@router.get("/hotspots")
def get_complaint_hotspots(
    db: Session = Depends(get_db)
):
    try:
        result = cluster_complaints(
            db,
            radius_km=0.5,
            min_complaints=2
        )

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
