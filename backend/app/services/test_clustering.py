
from app.database import SessionLocal
from app.services.clustering import cluster_complaints


def test_clustering():
    db = SessionLocal()

    try:
        result = cluster_complaints(
            db,
            radius_km=0.5,
            min_complaints=2
        )

        print("\n========== CIVICMIND HOTSPOT REPORT ==========")

        print("Total Complaints:", result["total_complaints"])
        print("Total Hotspots:", result["total_hotspots"])

        for hotspot in result["hotspots"]:
            print("\nHotspot ID:", hotspot["cluster_id"])
            print("Category:", hotspot["category"])
            print("Complaints:", hotspot["total_complaints"])
            print("Latitude:", hotspot["latitude"])
            print("Longitude:", hotspot["longitude"])

        print("\n========== TEST COMPLETED ==========")

    except Exception as e:
        print("Clustering Error:", e)

    finally:
        db.close()


if __name__ == "__main__":
    test_clustering()
