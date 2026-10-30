
import { useMemo, useState, useEffect } from "react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
  useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./MapView.css";

const DEFAULT_CENTER = [12.9716, 77.5946];

// ==========================================
// PRIORITY COLORS
// ==========================================

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case "critical":
      return "#ef4444";

    case "high":
      return "#f97316";

    case "medium":
      return "#eab308";

    case "low":
      return "#22c55e";

    default:
      return "#06b6d4";
  }
};

// ==========================================
// VALIDATE GPS COORDINATES
// ==========================================

const hasValidCoordinates = (item) => {
  if (item.latitude == null || item.longitude == null) {
    return false;
  }

  const lat = Number(item.latitude);
  const lng = Number(item.longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

// ==========================================
// AUTOMATIC MAP ZOOM CONTROLLER
// ==========================================

function MapController({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 15, {
        animate: true
      });
    } else {
      map.fitBounds(points, {
        padding: [55, 55],
        maxZoom: 15,
        animate: true
      });
    }
  }, [map, points]);

  return null;
}

// ==========================================
// MAIN MAP COMPONENT
// ==========================================

function MapView({
  complaints = [],
  hotspots = [],
  darkMode = false,
  onSelectComplaint
}) {
  const [category, setCategory] = useState("All");
  const [priority, setPriority] = useState("All");

  // ------------------------------------------
  // VALID COMPLAINTS
  // ------------------------------------------

  const validComplaints = useMemo(() => {
    return complaints.filter(hasValidCoordinates);
  }, [complaints]);

  // ------------------------------------------
  // VALID HOTSPOTS
  // ------------------------------------------

  const validHotspots = useMemo(() => {
    return hotspots.filter(hasValidCoordinates);
  }, [hotspots]);

  // ------------------------------------------
  // CATEGORY OPTIONS
  // ------------------------------------------

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(
        validComplaints
          .map(item => item.category)
          .filter(Boolean)
      )
    ];
  }, [validComplaints]);

  // ------------------------------------------
  // FILTER COMPLAINTS
  // ------------------------------------------

  const filteredComplaints = useMemo(() => {
    return validComplaints.filter(item => {
      const categoryMatch =
        category === "All" ||
        item.category === category;

      const itemPriority =
        (item.priority_level || "Not analyzed").toLowerCase();

      const priorityMatch =
        priority === "All" ||
        itemPriority === priority.toLowerCase();

      return categoryMatch && priorityMatch;
    });
  }, [validComplaints, category, priority]);

  // ------------------------------------------
  // FILTER HOTSPOTS BY CATEGORY
  // ------------------------------------------

  const filteredHotspots = useMemo(() => {
    return validHotspots.filter(hotspot => {
      return (
        category === "All" ||
        hotspot.category === category
      );
    });
  }, [validHotspots, category]);

  // ------------------------------------------
  // COMBINE COMPLAINT AND HOTSPOT COORDINATES
  // FOR AUTOMATIC ZOOM
  // ------------------------------------------

  const mapPoints = useMemo(() => {
    const complaintPoints = filteredComplaints.map(item => [
      Number(item.latitude),
      Number(item.longitude)
    ]);

    const hotspotPoints = filteredHotspots.map(item => [
      Number(item.latitude),
      Number(item.longitude)
    ]);

    return [
      ...complaintPoints,
      ...hotspotPoints
    ];
  }, [filteredComplaints, filteredHotspots]);

  // ------------------------------------------
  // STATISTICS
  // ------------------------------------------

  const criticalCount = filteredComplaints.filter(
    item => item.priority_level?.toLowerCase() === "critical"
  ).length;

  const highCount = filteredComplaints.filter(
    item => item.priority_level?.toLowerCase() === "high"
  ).length;

  const mediumCount = filteredComplaints.filter(
    item => item.priority_level?.toLowerCase() === "medium"
  ).length;

  const lowCount = filteredComplaints.filter(
    item => item.priority_level?.toLowerCase() === "low"
  ).length;

  const duplicateCount = filteredComplaints.filter(
    item => item.duplicate_of
  ).length;

  // ------------------------------------------
  // RENDER MAP
  // ------------------------------------------

  return (
    <section
      className={`map-panel ${
        darkMode ? "map-dark" : "map-light"
      }`}
    >

      {/* MAP HEADER */}

      <div className="map-heading">

        <div>
          <h2>Geographic Intelligence Map</h2>

          <p>
            Explore civic complaints and AI-detected hotspots.
          </p>
        </div>

        <span className="map-live">
          ● LIVE DATA
        </span>

      </div>

      {/* MAP STATISTICS */}

      <div className="map-stats">

        <div>
          <span>Complaints on Map</span>
          <strong>{filteredComplaints.length}</strong>
        </div>

        <div>
          <span>Hotspot Clusters</span>
          <strong>{filteredHotspots.length}</strong>
        </div>

        <div>
          <span>Critical Issues</span>
          <strong>{criticalCount}</strong>
        </div>

        <div>
          <span>Potential Duplicates</span>
          <strong>{duplicateCount}</strong>
        </div>

      </div>

      {/* PRIORITY SUMMARY */}

      <div className="priority-summary">

        <span>
          <i style={{ background: "#ef4444" }} />
          Critical: {criticalCount}
        </span>

        <span>
          <i style={{ background: "#f97316" }} />
          High: {highCount}
        </span>

        <span>
          <i style={{ background: "#eab308" }} />
          Medium: {mediumCount}
        </span>

        <span>
          <i style={{ background: "#22c55e" }} />
          Low: {lowCount}
        </span>

      </div>

      {/* FILTER CONTROLS */}

      <div className="map-filters">

        <label>
          Category

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {categories.map(item => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>

        </label>

        <label>
          Priority

          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Not analyzed">Not Analyzed</option>
          </select>

        </label>

        <button
          className="map-reset-button"
          onClick={() => {
            setCategory("All");
            setPriority("All");
          }}
        >
          ↻ Reset Filters
        </button>

      </div>

      {/* MAP LEGEND */}

      <div className="map-legend">

        <span>
          <i style={{ background: "#ef4444" }} />
          Critical
        </span>

        <span>
          <i style={{ background: "#f97316" }} />
          High
        </span>

        <span>
          <i style={{ background: "#eab308" }} />
          Medium
        </span>

        <span>
          <i style={{ background: "#22c55e" }} />
          Low
        </span>

        <span>
          <i style={{ background: "#06b6d4" }} />
          Other
        </span>

        <span>
          <i className="hotspot-legend" />
          Hotspot
        </span>

      </div>

      {/* EMPTY STATE */}

      {filteredComplaints.length === 0 &&
        filteredHotspots.length === 0 && (
          <p className="map-notice">
            No complaints or hotspots match the selected filters.
          </p>
        )}

      {/* LEAFLET MAP */}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={true}
        className="civic-map"
      >

        {/* OPENSTREETMAP TILES */}

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* AUTOMATIC ZOOM */}

        <MapController points={mapPoints} />

        {/* ==================================
            HOTSPOT CLUSTERS
        ================================== */}

        {filteredHotspots.map((hotspot, index) => {

          const count = Number(
            hotspot.total_complaints || 0
          );

          const radius = Math.min(
            150 + count * 45,
            900
          );

          return (
            <Circle
              key={hotspot.cluster_id || index}
              center={[
                Number(hotspot.latitude),
                Number(hotspot.longitude)
              ]}
              radius={radius}
              pathOptions={{
                color: "#a855f7",
                fillColor: "#a855f7",
                fillOpacity: 0.22,
                weight: 2
              }}
            >

              <Tooltip
                permanent
                direction="center"
                className="hotspot-count-tooltip"
              >
                <strong>
                  {count}
                </strong>
              </Tooltip>

              <Popup>

                <div className="complaint-popup">

                  <h3>✦ {hotspot.category} Hotspot</h3>

                  <p>
                    <strong>Cluster ID:</strong>
                    {" "}{hotspot.cluster_id || "N/A"}
                  </p>

                  <p>
                    <strong>Total Complaints:</strong>
                    {" "}{count}
                  </p>

                  <p>
                    <strong>Latitude:</strong>
                    {" "}{Number(hotspot.latitude).toFixed(6)}
                  </p>

                  <p>
                    <strong>Longitude:</strong>
                    {" "}{Number(hotspot.longitude).toFixed(6)}
                  </p>

                  <p>
                    This geographic area contains {count} reported complaints.
                  </p>

                </div>

              </Popup>

            </Circle>
          );
        })}

        {/* ==================================
            INDIVIDUAL COMPLAINT MARKERS
        ================================== */}

        {filteredComplaints.map((item, index) => {

          const markerColor = getPriorityColor(
            item.priority_level
          );

          return (
            <CircleMarker
              key={item.id || item.tracking_id || index}
              center={[
                Number(item.latitude),
                Number(item.longitude)
              ]}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: markerColor,
                fillOpacity: 0.95
              }}
              eventHandlers={{
                click: () => {
                  onSelectComplaint?.(item);
                }
              }}
            >

              <Popup>

                <div className="complaint-popup">

                  <h3>
                    {item.tracking_id || "Complaint"}
                  </h3>

                  <p>
                    {item.description || "No description available"}
                  </p>

                  <hr />

                  <p>
                    <strong>Category:</strong>
                    {" "}{item.category || "Unknown"}
                  </p>

                  <p>
                    <strong>Priority:</strong>
                    {" "}
                    <span
                      style={{
                        color: markerColor,
                        fontWeight: "bold"
                      }}
                    >
                      {item.priority_level || "Not analyzed"}
                    </span>
                  </p>

                  <p>
                    <strong>Status:</strong>
                    {" "}{item.status || "Unknown"}
                  </p>

                  <p>
                    <strong>Department:</strong>
                    {" "}{item.assigned_department || "Unassigned"}
                  </p>

                  <p>
                    <strong>Address:</strong>
                    {" "}{item.address || "Unavailable"}
                  </p>

                  <p>
                    <strong>Coordinates:</strong>
                    {" "}
                    {Number(item.latitude).toFixed(6)},
                    {" "}
                    {Number(item.longitude).toFixed(6)}
                  </p>

                  <p>
                    <strong>Duplicate:</strong>
                    {" "}{item.duplicate_of ? "Yes" : "No"}
                  </p>

                  <button
                    type="button"
                    onClick={() => onSelectComplaint?.(item)}
                  >
                    View Full Details
                  </button>

                </div>

              </Popup>

            </CircleMarker>
          );
        })}

      </MapContainer>

      {/* MAP FOOTER */}

      <p className="map-footer">
        Map data © OpenStreetMap contributors.
        Complaint locations are based on GPS coordinates
        stored in CivicMind AI.
      </p>

    </section>
  );
}

export default MapView;
