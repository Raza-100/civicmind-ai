
from app.services.categorizer import categorize_complaint

test_complaints = [
    "Garbage is piling up near my apartment.",
    "There is a huge pothole on the main road.",
    "The drain is blocked and sewage is overflowing.",
    "Streetlight is not working near our school.",
    "There is an uncovered manhole creating danger."
]

for complaint in test_complaints:
    result = categorize_complaint(complaint)

    print("\nComplaint:", complaint)
    print("AI Analysis:", result)
