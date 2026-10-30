
import re
from difflib import SequenceMatcher
from math import radians, sin, cos, sqrt, atan2


# Detection thresholds
TEXT_SIMILARITY_THRESHOLD = 0.65
DISTANCE_THRESHOLD_KM = 0.5


def normalize_text(text: str) -> str:
    """Clean complaint text for comparison."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate similarity between two descriptions."""
    first = normalize_text(text1)
    second = normalize_text(text2)

    return SequenceMatcher(
        None, first, second
    ).ratio()


def calculate_distance(lat1, lon1, lat2, lon2) -> float:
    """Calculate geographical distance in kilometers."""

    earth_radius = 6371.0

    lat1, lon1, lat2, lon2 = map(
        radians, [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return earth_radius * c


def detect_duplicate(
    description: str,
    latitude: float,
    longitude: float,
    existing_complaints: list
):
    """
    Compare a new complaint against existing complaints.

    Returns duplicate details and an explanation.
    """

    best_match = None
    highest_similarity = 0.0

    for complaint in existing_complaints:

        similarity = calculate_text_similarity(
            description,
            complaint.description
        )

        distance = calculate_distance(
            latitude,
            longitude,
            complaint.latitude,
            complaint.longitude
        )

        if (
            similarity >= TEXT_SIMILARITY_THRESHOLD
            and distance <= DISTANCE_THRESHOLD_KM
        ):

            if similarity > highest_similarity:
                highest_similarity = similarity

                best_match = {
                    "duplicate_id": complaint.id,
                    "tracking_id": complaint.tracking_id,
                    "similarity_score": round(similarity, 2),
                    "distance_km": round(distance, 3),
                    "explanation": (
                        "Similar complaint found within "
                        f"{DISTANCE_THRESHOLD_KM} km."
                    )
                }

    return {
        "is_duplicate": best_match is not None,
        "match": best_match
    }
