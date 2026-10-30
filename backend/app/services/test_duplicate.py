
from types import SimpleNamespace

from app.services.duplicate import detect_duplicate


existing = [
    SimpleNamespace(
        id="123",
        tracking_id="CIV-12345678",
        description="A large pothole near the main road.",
        latitude=12.9716,
        longitude=77.5946
    )
]

result = detect_duplicate(
    description="There is a large pothole near the main road.",
    latitude=12.9717,
    longitude=77.5947,
    existing_complaints=existing
)

print("Duplicate Detection Result:")
print(result)
