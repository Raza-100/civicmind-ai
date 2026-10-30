
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

# CivicMind AI - Synthetic Complaint Generator
# All reports and addresses are fictional demonstration data.

random.seed(42)

OUTPUT_FILE = Path(__file__).parent / "synthetic_reports.json"

CATEGORIES = [
    "Road Damage",
    "Waterlogging",
    "Waste Management",
    "Streetlight",
    "Drainage",
    "Water Supply",
    "Public Safety",
    "Other",
]

STATUSES = [
    "Submitted",
    "Under Review",
    "Assigned",
    "Resolved",
]

DEPARTMENTS = {
    "Road Damage": "Road Maintenance",
    "Waterlogging": "Drainage Department",
    "Waste Management": "Sanitation Department",
    "Streetlight": "Electrical Department",
    "Drainage": "Drainage Department",
    "Water Supply": "Water Supply Department",
    "Public Safety": "Public Safety Department",
    "Other": "General Civic Services",
}

# Three fictional demonstration areas.
CLUSTERS = {
    "CLUSTER-01": {
        "name": "Area Alpha",
        "latitude": 12.9716,
        "longitude": 77.5946,
    },
    "CLUSTER-02": {
        "name": "Area Beta",
        "latitude": 12.9352,
        "longitude": 77.6245,
    },
    "CLUSTER-03": {
        "name": "Area Gamma",
        "latitude": 12.9980,
        "longitude": 77.5500,
    },
}

# 32 original incidents.
INCIDENTS = [
    ("Road Damage", "A large pothole is damaging vehicles near the main road.", "CLUSTER-01", 68),
    ("Waterlogging", "Heavy rain has caused water to accumulate on the road.", "CLUSTER-01", 86),
    ("Drainage", "A blocked drain is preventing rainwater from flowing.", "CLUSTER-01", 82),
    ("Public Safety", "An exposed electrical wire is hanging near a public footpath.", "CLUSTER-01", 98),
    ("Streetlight", "Streetlight is not working near the junction.", "CLUSTER-01", 48),
    ("Waste Management", "Garbage bins are overflowing near the market.", "CLUSTER-01", 57),
    ("Road Damage", "The pavement is broken and pedestrians are struggling.", "CLUSTER-01", 65),
    ("Waterlogging", "Water is accumulating outside the bus stop.", "CLUSTER-01", 76),
    ("Drainage", "Drain cover is damaged and needs inspection.", "CLUSTER-01", 91),
    ("Waste Management", "Uncollected garbage has accumulated near shops.", "CLUSTER-01", 55),
    ("Water Supply", "Residents are reporting low water pressure.", "CLUSTER-01", 43),
    ("Other", "A public park bench has been damaged.", "CLUSTER-01", 22),

    ("Road Damage", "A deep pothole has appeared near the intersection.", "CLUSTER-02", 78),
    ("Waterlogging", "Rainwater is flooding the residential street.", "CLUSTER-02", 89),
    ("Drainage", "The roadside drainage channel is blocked.", "CLUSTER-02", 85),
    ("Public Safety", "A fallen tree branch is obstructing the road.", "CLUSTER-02", 96),
    ("Streetlight", "Two streetlights are not functioning.", "CLUSTER-02", 52),
    ("Waste Management", "Waste is scattered around the collection point.", "CLUSTER-02", 61),
    ("Water Supply", "Water supply has been interrupted in the area.", "CLUSTER-02", 72),
    ("Road Damage", "Broken road surface is creating a hazard for cyclists.", "CLUSTER-02", 80),
    ("Waterlogging", "Standing water is blocking pedestrian access.", "CLUSTER-02", 75),
    ("Waste Management", "Garbage collection has not happened for several days.", "CLUSTER-02", 58),

    ("Road Damage", "A damaged section of road needs urgent repair.", "CLUSTER-03", 70),
    ("Waterlogging", "Water has collected near the school entrance.", "CLUSTER-03", 88),
    ("Drainage", "The stormwater drain is clogged with debris.", "CLUSTER-03", 83),
    ("Public Safety", "An uncovered manhole is creating a serious safety risk.", "CLUSTER-03", 99),
    ("Streetlight", "Streetlight near the public crossing has failed.", "CLUSTER-03", 67),
    ("Waste Management", "Overflowing waste container is attracting stray animals.", "CLUSTER-03", 64),
    ("Water Supply", "Water leakage is occurring near the roadside pipe.", "CLUSTER-03", 73),
    ("Other", "A damaged public signboard needs replacement.", "CLUSTER-03", 20),
    ("Road Damage", "Loose road material is creating a hazard for motorists.", "CLUSTER-03", 62),
    ("Waste Management", "Uncollected waste is accumulating near the park.", "CLUSTER-03", 56),
]

# Deliberate duplicate reports referencing original incident indexes.
DUPLICATES = [
    (1, "Water is collecting on the same road after rainfall."),
    (2, "The drain nearby is blocked and rainwater cannot flow."),
    (4, "The electrical wire is exposed and hanging near the footpath."),
    (6, "Pedestrians are having trouble using the damaged pavement."),
    (13, "Flooding is occurring on the same residential street."),
    (14, "Drainage blockage is causing water flow problems."),
    (16, "The streetlights near the junction are still not working."),
    (26, "There is an uncovered manhole near the public area."),
]


def make_timestamp(days_ago):
    timestamp = datetime.now() - timedelta(
        days=days_ago,
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return timestamp.replace(microsecond=0).isoformat()


def make_report(report_number, description, category, cluster_id,
                priority_score, duplicate_of=None):

    cluster = CLUSTERS[cluster_id]

    # Small coordinate variations around each geographic cluster.
    latitude = round(
        cluster["latitude"] + random.uniform(-0.0015, 0.0015), 6
    )
    longitude = round(
        cluster["longitude"] + random.uniform(-0.0015, 0.0015), 6
    )

    status = random.choice(STATUSES)

    reasons = []
    if priority_score >= 90:
        reasons.append("Potential immediate public safety hazard")
    elif priority_score >= 75:
        reasons.append("Significant infrastructure or service disruption")
    elif priority_score >= 50:
        reasons.append("Moderate impact on public convenience")
    else:
        reasons.append("Routine maintenance issue")

    if category == "Public Safety":
        reasons.append("Requires prompt safety inspection")

    if duplicate_of:
        reasons.append("Potential duplicate of an existing report")

    return {
        "id": f"RPT-{report_number:04d}",
        "tracking_id": f"CIV-TRACK-{report_number:04d}",
        "description": description,
        "image_url": None,
        "category": category,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "address": f"Synthetic location, {cluster['name']}",
        },
        "ai_analysis": {
            "summary": None,
            "category": None,
            "priority_score": None,
            "priority_level": None,
            "priority_reasons": [],
            "duplicate_of": None,
            "similarity_score": None,
        },
        "cluster_id": cluster_id,
        "status": status,
        "assigned_department": (
            DEPARTMENTS[category] if status in ["Assigned", "Resolved"]
            else None
        ),
        "created_at": make_timestamp(random.randint(0, 20)),
        "updated_at": make_timestamp(random.randint(0, 5)),
        "ground_truth": {
            "expected_category": category,
            "expected_priority_score": priority_score,
            "duplicate_of": duplicate_of,
            "is_synthetic": True,
        },
    }


def generate_reports():
    reports = []

    # Generate 32 original incidents.
    for index, incident in enumerate(INCIDENTS, start=1):
        category, description, cluster_id, score = incident

        reports.append(
            make_report(
                index, description, category, cluster_id, score
            )
        )

    # Generate 8 deliberate duplicates.
    for offset, (original_index, description) in enumerate(
        DUPLICATES, start=33
    ):
        original = reports[original_index - 1]

        reports.append(
            make_report(
                offset,
                description,
                original["category"],
                original["cluster_id"],
                original["ground_truth"]["expected_priority_score"],
                duplicate_of=original["id"],
            )
        )

    random.shuffle(reports)

    # Restore stable IDs after shuffling; IDs remain unchanged.
    OUTPUT_FILE.write_text(
        json.dumps(reports, indent=2),
        encoding="utf-8",
    )

    print("CivicMind AI synthetic dataset generated!")
    print(f"Total reports: {len(reports)}")
    print(f"Original reports: {len(reports) - len(DUPLICATES)}")
    print(f"Deliberate duplicates: {len(DUPLICATES)}")
    print(f"Geographic clusters: {len(CLUSTERS)}")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_reports()
