
# CivicMind AI - Automatic Complaint Categorization

CATEGORY_KEYWORDS = {
    "Road Damage": [
        "pothole", "road", "crack", "broken road",
        "damaged road", "footpath", "pavement"
    ],
    "Waterlogging": [
        "waterlogging", "flood", "flooding",
        "standing water", "water accumulation"
    ],
    "Waste Management": [
        "garbage", "waste", "trash", "rubbish",
        "dump", "litter", "dustbin", "smell"
    ],
    "Streetlight": [
        "streetlight", "street light", "lamp",
        "dark road", "no lighting", "light not working"
    ],
    "Drainage": [
        "drain", "drainage", "sewage",
        "manhole", "blocked sewer", "overflowing drain"
    ],
    "Water Supply": [
        "water supply", "water leakage", "pipe leak",
        "no water", "drinking water", "water shortage"
    ],
    "Public Safety": [
        "accident", "exposed wire", "electric shock",
        "uncovered manhole", "danger", "unsafe",
        "injury", "fire"
    ]
}

DEPARTMENTS = {
    "Road Damage": "Public Works Department",
    "Waterlogging": "Stormwater Management Department",
    "Waste Management": "Municipal Sanitation Department",
    "Streetlight": "Electrical Maintenance Department",
    "Drainage": "Municipal Drainage Department",
    "Water Supply": "Water Supply Department",
    "Public Safety": "Public Safety Department",
    "Other": "General Municipal Department"
}


def categorize_complaint(description: str):

    text = description.lower()

    category_scores = {}

    for category, keywords in CATEGORY_KEYWORDS.items():

        score = sum(
            1 for keyword in keywords
            if keyword in text
        )

        if score > 0:
            category_scores[category] = score

    if not category_scores:
        return {
            "category": "Other",
            "department": DEPARTMENTS["Other"],
            "confidence": 0.0,
            "explanation": "No matching category keywords found."
        }

    best_category = max(
        category_scores,
        key=category_scores.get
    )

    total_matches = sum(category_scores.values())

    confidence = (
        category_scores[best_category] / total_matches
    )

    return {
        "category": best_category,
        "department": DEPARTMENTS[best_category],
        "confidence": round(confidence, 2),
        "explanation": (
            f"Matched {category_scores[best_category]} "
            f"keyword(s) for {best_category}."
        )
    }
