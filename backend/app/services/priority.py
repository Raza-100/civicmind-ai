
CATEGORY_SCORES = {
    "Road Damage": 55,
    "Waterlogging": 65,
    "Waste Management": 40,
    "Streetlight": 35,
    "Drainage": 60,
    "Water Supply": 55,
    "Public Safety": 75,
    "Other": 20,
}

RISK_KEYWORDS = {
    "uncovered manhole": 25,
    "exposed wire": 25,
    "electrical wire": 25,
    "electric shock": 25,
    "accident": 20,
    "injury": 20,
    "flooding": 15,
    "deep pothole": 15,
    "blocked road": 10,
    "overflowing": 10,
    "leakage": 8,
    "broken": 5,
}


def calculate_priority(description: str, category: str):
    score = CATEGORY_SCORES.get(category, 20)

    reasons = [
        f"Base category severity: {category} (+{score})"
    ]

    text = description.lower()

    for keyword, points in RISK_KEYWORDS.items():
        if keyword in text:
            score += points
            reasons.append(
                f"Risk keyword detected: '{keyword}' (+{points})"
            )

    score = min(score, 100)

    if score >= 85:
        level = "Critical"
    elif score >= 65:
        level = "High"
    elif score >= 40:
        level = "Medium"
    else:
        level = "Low"

    reasons.append(f"Final priority score: {score}/100")

    return {
        "priority_score": score,
        "priority_level": level,
        "priority_reasons": reasons
    }
