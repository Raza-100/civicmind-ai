
import uuid
import math

from app.models.complaint import Complaint


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometres."""

    earth_radius = 6371.0

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return earth_radius * c


def cluster_complaints(
    db,
    radius_km=0.5,
    min_complaints=3
):
    """
    Identify geographic hotspots using a DBSCAN-style
    density-based clustering approach.

    Complaints are grouped by location and category.
    """

    complaints = db.query(Complaint).all()

    visited = set()
    clusters = []

    def get_neighbours(complaint):
        neighbours = []

        for other in complaints:

            if complaint.category != other.category:
                continue

            distance = calculate_distance(
                complaint.latitude,
                complaint.longitude,
                other.latitude,
                other.longitude
            )

            if distance <= radius_km:
                neighbours.append(other)

        return neighbours

    for complaint in complaints:

        if complaint.id in visited:
            continue

        visited.add(complaint.id)

        neighbours = get_neighbours(complaint)

        if len(neighbours) < min_complaints:
            complaint.cluster_id = None
            continue

        cluster_id = (
            f"HOTSPOT-{uuid.uuid4().hex[:8].upper()}"
        )

        cluster_members = []
        queue = list(neighbours)
        queued_ids = {item.id for item in queue}

        while queue:

            current = queue.pop(0)

            if current.id not in visited:

                visited.add(current.id)

                current_neighbours = get_neighbours(current)

                if len(current_neighbours) >= min_complaints:

                    for neighbour in current_neighbours:
                        if neighbour.id not in queued_ids:
                            queue.append(neighbour)
                            queued_ids.add(neighbour.id)

            if current.id not in {
                member.id for member in cluster_members
            }:
                current.cluster_id = cluster_id
                cluster_members.append(current)

        if complaint.id not in {
            member.id for member in cluster_members
        }:
            complaint.cluster_id = cluster_id
            cluster_members.append(complaint)

        clusters.append({
            "cluster_id": cluster_id,
            "category": complaint.category,
            "total_complaints": len(cluster_members),
            "latitude": sum(
                item.latitude for item in cluster_members
            ) / len(cluster_members),
            "longitude": sum(
                item.longitude for item in cluster_members
            ) / len(cluster_members)
        })

    db.commit()

    return {
        "total_complaints": len(complaints),
        "total_hotspots": len(clusters),
        "hotspots": clusters
    }
