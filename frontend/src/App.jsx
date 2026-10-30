
import { useState, useEffect, useCallback } from "react";
import "./App.css";
import MapView from "./MapView";
const API_URL = "http://127.0.0.1:8000";

function App() {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("civic-theme") !== "light"
  );

  const [page, setPage] = useState("Dashboard");
  const [complaints, setComplaints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // New complaint form state
  const [formData, setFormData] = useState({
    description: "",
    category: "Other",
    latitude: "",
    longitude: "",
    address: ""
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("info");

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("civic-theme", next ? "dark" : "light");
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setError("");

      const [complaintsResponse, hotspotsResponse] =
        await Promise.all([
          fetch(`${API_URL}/complaints/`),
          fetch(`${API_URL}/complaints/hotspots`)
        ]);

      if (!complaintsResponse.ok || !hotspotsResponse.ok) {
        throw new Error("Unable to fetch dashboard data.");
      }

      const complaintsData = await complaintsResponse.json();
      const hotspotsData = await hotspotsResponse.json();

      setComplaints(
        Array.isArray(complaintsData) ? complaintsData : []
      );

      setHotspots(
        Array.isArray(hotspotsData.hotspots)
          ? hotspotsData.hotspots
          : []
      );
    } catch (err) {
      console.error("Dashboard API Error:", err);
      setError("Cannot connect to backend. Check that FastAPI is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const totalComplaints = complaints.length;

  const criticalComplaints = complaints.filter(
    item => item.priority_level?.toLowerCase() === "critical"
  ).length;

  const duplicateReports = complaints.filter(
    item => item.duplicate_of
  ).length;

  const recentComplaints = [...complaints]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .slice(0, 5);

  const filteredComplaints = complaints.filter(item => {
    const query = search.toLowerCase();

    const matchesSearch = [
      item.tracking_id,
      item.description,
      item.category,
      item.address,
      item.assigned_department
    ].some(value => String(value || "").toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "All" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openMap = complaint => {
    if (
      complaint.latitude == null ||
      complaint.longitude == null
    ) {
      alert("Location coordinates are not available.");
      return;
    }

    window.open(
      `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openDetails = complaint => {
    setSelectedComplaint(complaint);
  };

  const closeDetails = () => {
    setSelectedComplaint(null);
  };

  const formatReasons = reasons => {
    if (!reasons) return null;
    if (Array.isArray(reasons)) return reasons.join(", ");
    return String(reasons);
  };

  // Capture the citizen's actual browser GPS coordinates.
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormMessageType("error");
      setFormMessage("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setFormMessage("");

    navigator.geolocation.getCurrentPosition(
      position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setFormData(previous => ({
          ...previous,
          latitude: latitude.toFixed(7),
          longitude: longitude.toFixed(7)
        }));

        setLocationLoading(false);
        setFormMessageType("success");
        setFormMessage(
          `Location captured (accuracy approximately ${Math.round(position.coords.accuracy)} metres).`
        );
      },
      geoError => {
        setLocationLoading(false);
        setFormMessageType("error");

        const messages = {
          1: "Location permission was denied. Allow location access in your browser and try again.",
          2: "Your location is currently unavailable. Check your device location settings and try again.",
          3: "Location detection timed out. Please try again."
        };

        setFormMessage(
          messages[geoError.code] || "Unable to detect your location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  // Submit a new complaint to the existing FastAPI endpoint.
  const submitComplaint = async event => {
    event.preventDefault();

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);

    if (!formData.latitude || !formData.longitude) {
      setFormMessageType("error");
      setFormMessage("Capture your GPS location before submitting the complaint.");
      return;
    }

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      setFormMessageType("error");
      setFormMessage("Please capture a valid GPS location.");
      return;
    }

    try {
      setSubmitting(true);
      setFormMessage("");

      const response = await fetch(`${API_URL}/complaints/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          description: formData.description.trim(),
          // The current Pydantic schema requires category. The backend's AI
          // categorizer determines the final category from the description.
          category: formData.category,
          latitude,
          longitude,
          address: formData.address.trim()
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = Array.isArray(result.detail)
          ? result.detail.map(item => item.msg).join("; ")
          : result.detail;
        throw new Error(detail || "Complaint submission failed.");
      }

      setFormMessageType("success");
      setFormMessage(
        `Complaint submitted successfully. Tracking ID: ${result.tracking_id || "Generated"}`
      );

      setFormData({
        description: "",
        category: "Other",
        latitude: "",
        longitude: "",
        address: ""
      });

      await fetchDashboardData();
    } catch (submitError) {
      console.error("Complaint submission error:", submitError);
      setFormMessageType("error");
      setFormMessage(submitError.message || "Unable to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  // Theme-aware styles keep the form readable in both dark and light modes.
  const formControlStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "9px",
    border: darkMode ? "1px solid #34445c" : "1px solid #cbd5e1",
    background: darkMode ? "#0f1726" : "#ffffff",
    color: darkMode ? "#f1f5f9" : "#1e293b",
    font: "inherit",
    marginTop: "7px"
  };

  const formLabelStyle = {
    display: "block",
    color: darkMode ? "#dbeafe" : "#334155",
    fontWeight: 600,
    marginTop: "16px"
  };

  const renderDashboard = () => (
    <>
      <header className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to CivicMind AI Intelligence Platform</p>
        </div>

        <div className="dashboard-actions">
          <span className="status">● System Online</span>
          <button
            className="refresh-button"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <section className="welcome">
        <div>
          <h2>Civic Intelligence Overview</h2>
          <p>
            Monitor, analyze and resolve civic complaints intelligently.
          </p>
        </div>
        <span>✦ AI Powered</span>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Complaints</span>
          <h2>{loading ? "--" : totalComplaints}</h2>
          <p>Registered complaints</p>
        </div>

        <div className="stat-card">
          <span>Critical Complaints</span>
          <h2>{loading ? "--" : criticalComplaints}</h2>
          <p>Require urgent attention</p>
        </div>

        <div className="stat-card">
          <span>AI Hotspots</span>
          <h2>{loading ? "--" : hotspots.length}</h2>
          <p>Geographic clusters</p>
        </div>

        <div className="stat-card">
          <span>Duplicate Reports</span>
          <h2>{loading ? "--" : duplicateReports}</h2>
          <p>Potential duplicate cases</p>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h3>AI Intelligence Center</h3>
          <p>✦ Automatic complaint categorization</p>
          <p>✦ Explainable priority analysis</p>
          <p>✦ Duplicate complaint detection</p>
          <p>✦ Geographic hotspot identification</p>
        </div>

        <div className="panel">
          <h3>Platform Status</h3>
          <p>Frontend <span className="online">Online</span></p>
          <p>AI Engine <span className="online">Ready</span></p>
          <p>
            Database
            <span className="online">
              {error ? "Check Connection" : "Connected"}
            </span>
          </p>
          <p>
            API
            <span className="online">
              {error ? "Offline" : "Ready"}
            </span>
          </p>
        </div>
      </section>

      <section className="panel recent-panel">
        <div className="section-heading">
          <h3>Recent Civic Complaints</h3>
          <button onClick={() => setPage("Complaints")}>
            View All →
          </button>
        </div>

        {loading ? (
          <p>Loading complaints...</p>
        ) : recentComplaints.length === 0 ? (
          <p>No complaints registered yet.</p>
        ) : (
          <div className="complaints-table-wrapper">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {recentComplaints.map(item => (
                  <tr key={item.id}>
                    <td>{item.tracking_id}</td>
                    <td>{item.category}</td>
                    <td>{item.assigned_department || "Unassigned"}</td>
                    <td>{item.status}</td>
                    <td>{item.priority_level || "Not analyzed"}</td>
                    <td>
                      <button
                        className="small-action"
                        onClick={() => openDetails(item)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {renderHotspots()}
    </>
  );

  const renderComplaints = () => (
    <>
      <header className="topbar">
        <div>
          <h1>Complaint Management</h1>
          <p>Monitor and manage all registered civic complaints.</p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchDashboardData}
        >
          ↻ Refresh
        </button>
      </header>

      <section className="welcome">
        <div>
          <h2>Citizen Complaint Registry</h2>
          <p>Search, inspect and locate reported civic issues.</p>
        </div>
        <span>✦ Live Data</span>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Reports</span>
          <h2>{complaints.length}</h2>
        </div>
        <div className="stat-card">
          <span>Critical</span>
          <h2>{criticalComplaints}</h2>
        </div>
        <div className="stat-card">
          <span>Duplicates</span>
          <h2>{duplicateReports}</h2>
        </div>
        <div className="stat-card">
          <span>Hotspots</span>
          <h2>{hotspots.length}</h2>
        </div>
      </section>

      <section className="panel recent-panel">
        <h3>Register New Civic Complaint</h3>
        <p>Describe the issue and capture its actual GPS location.</p>

        <form onSubmit={submitComplaint}>
          <label style={formLabelStyle} htmlFor="complaint-description">
            Complaint Description
          </label>
          <textarea
            id="complaint-description"
            required
            minLength={10}
            rows={4}
            placeholder="Example: A large pothole is causing traffic problems near the bus stop."
            value={formData.description}
            onChange={event =>
              setFormData(previous => ({
                ...previous,
                description: event.target.value
              }))
            }
            style={{ ...formControlStyle, resize: "vertical" }}
          />

          <label style={formLabelStyle} htmlFor="complaint-category">
            Initial Category
          </label>
          <select
            id="complaint-category"
            value={formData.category}
            onChange={event =>
              setFormData(previous => ({
                ...previous,
                category: event.target.value
              }))
            }
            style={formControlStyle}
          >
            <option value="Other">Other</option>
            <option value="Road Damage">Road Damage</option>
            <option value="Waste Management">Waste Management</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Street Lighting">Street Lighting</option>
            <option value="Drainage">Drainage</option>
          </select>
          <small style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>
            The backend AI categorizer will assign the final category based on the description.
          </small>

          <label style={formLabelStyle} htmlFor="complaint-address">
            Address / Nearby Landmark
          </label>
          <input
            id="complaint-address"
            type="text"
            required
            maxLength={500}
            placeholder="Enter street, area or nearby landmark"
            value={formData.address}
            onChange={event =>
              setFormData(previous => ({
                ...previous,
                address: event.target.value
              }))
            }
            style={formControlStyle}
          />

          <div style={{ marginTop: "18px" }}>
            <button
              type="button"
              className="small-action"
              onClick={getCurrentLocation}
              disabled={locationLoading || submitting}
            >
              {locationLoading ? "Detecting GPS Location..." : "📍 Use My Current Location"}
            </button>
          </div>

          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              borderRadius: "8px",
              background: darkMode ? "#0f1726" : "#f1f5f9",
              color: darkMode ? "#cbd5e1" : "#475569"
            }}
          >
            {formData.latitude && formData.longitude ? (
              <>
                <strong>GPS coordinates captured</strong>
                <p style={{ margin: "6px 0 0" }}>
                  Latitude: {formData.latitude}<br />
                  Longitude: {formData.longitude}
                </p>
              </>
            ) : (
              <span>GPS location has not been captured yet.</span>
            )}
          </div>

          {formMessage && (
            <p
              role="status"
              style={{
                marginTop: "12px",
                color: formMessageType === "error"
                  ? (darkMode ? "#fca5a5" : "#b91c1c")
                  : formMessageType === "success"
                    ? (darkMode ? "#86efac" : "#15803d")
                    : (darkMode ? "#cbd5e1" : "#475569")
              }}
            >
              {formMessage}
            </p>
          )}

          <button
            type="submit"
            className="refresh-button"
            disabled={submitting || locationLoading}
            style={{ marginTop: "18px" }}
          >
            {submitting ? "Submitting Complaint..." : "Submit Complaint"}
          </button>
        </form>
      </section>

      <section className="panel recent-panel">
        <h3>All Civic Complaints</h3>

        <div className="complaint-filters">
          <input
            type="search"
            placeholder="Search tracking ID, category, address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {[...new Set(complaints.map(c => c.status).filter(Boolean))].map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p>Loading complaints...</p>
        ) : filteredComplaints.length === 0 ? (
          <p>No matching complaints found.</p>
        ) : (
          <div className="complaints-table-wrapper">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredComplaints.map(item => (
                  <tr key={item.id}>
                    <td>{item.tracking_id}</td>
                    <td>{item.description}</td>
                    <td>{item.category}</td>
                    <td>{item.assigned_department || "Unassigned"}</td>
                    <td>{item.status}</td>
                    <td>{item.priority_level || "Not analyzed"}</td>
                    <td>
                      {item.latitude != null && item.longitude != null
                        ? `${item.latitude}, ${item.longitude}`
                        : "Unavailable"}
                    </td>
                    <td>
                      <button
                        className="small-action"
                        onClick={() => openDetails(item)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );


  const renderHotspots = () => (
    <section className="panel recent-panel">
      <div className="section-heading">
        <div>
          <h3>Geographic Hotspot Overview</h3>
          <p>
            Explore civic complaints and AI-detected
            geographic clusters.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading geographic data...</p>
      ) : (
        <MapView
          complaints={complaints}
          hotspots={hotspots}
          darkMode={darkMode}
          onSelectComplaint={openDetails}
        />
      )}
    </section>
  );

  const renderOtherPage = () => (
    <section className="panel recent-panel">
      <h2>{page}</h2>
      <p>This section is ready for the next development phase.</p>
      <button
        className="refresh-button"
        onClick={() => setPage("Dashboard")}
      >
        Back to Dashboard
      </button>
    </section>
  );

  return (
    <div className={darkMode ? "app dark" : "app light"}>

      <aside className="sidebar">
        <h2 className="logo">
          CivicMind <span>AI</span>
        </h2>

        <nav>
          <p className="nav-label">MAIN MENU</p>

          {[
            ["Dashboard", "▦"],
            ["Complaints", "◉"],
            ["Geographic Hotspots", "⌖"],
            ["AI Intelligence", "✦"],
            ["Reports", "▤"]
          ].map(([name, icon]) => (
            <a
              key={name}
              href="#"
              className={page === name ? "active" : ""}
              onClick={e => {
                e.preventDefault();
                setPage(name === "Geographic Hotspots" ? "Hotspots" : name);
              }}
            >
              {icon} {name}
            </a>
          ))}

          <p className="nav-label">SYSTEM</p>

          <a
            href="#"
            className={page === "Settings" ? "active" : ""}
            onClick={e => {
              e.preventDefault();
              setPage("Settings");
            }}
          >
            ⚙ Settings
          </a>
        </nav>

        <button className="theme-toggle" onClick={toggleTheme}>
          {darkMode ? "☀ Light Mode" : "☾ Dark Mode"}
        </button>
      </aside>

      <main className="main-content">

        {error && (
          <div className="dashboard-error">
            ⚠ {error}
          </div>
        )}

        {page === "Dashboard" && renderDashboard()}
        {page === "Complaints" && renderComplaints()}
        {page === "Hotspots" && (
          <>
            <header className="topbar">
              <div>
                <h1>Geographic Hotspots</h1>
                <p>Explore clusters of civic complaints.</p>
              </div>
              <button
                className="refresh-button"
                onClick={fetchDashboardData}
              >
                ↻ Refresh
              </button>
            </header>
            {renderHotspots()}
          </>
        )}
        {!["Dashboard", "Complaints", "Hotspots"].includes(page) &&
          renderOtherPage()}

        <footer>
          CivicMind AI © 2026 | Intelligent Civic Governance
        </footer>
      </main>

      {/* COMPLAINT DETAILS MODAL */}
      {selectedComplaint && (
        <div
          className="details-overlay"
          onClick={closeDetails}
        >
          <div
            className="details-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="details-header">
              <div>
                <h2>Complaint Details</h2>
                <p>{selectedComplaint.tracking_id}</p>
              </div>

              <button
                className="close-details"
                onClick={closeDetails}
              >
                ✕
              </button>
            </div>

            <div className="details-body">

              <div className="detail-block">
                <label>Description</label>
                <p>{selectedComplaint.description || "Not available"}</p>
              </div>

              <div className="details-grid">
                <div className="detail-block">
                  <label>Category</label>
                  <p>{selectedComplaint.category || "N/A"}</p>
                </div>

                <div className="detail-block">
                  <label>AI Category</label>
                  <p>{selectedComplaint.ai_category || "N/A"}</p>
                </div>

                <div className="detail-block">
                  <label>Department</label>
                  <p>{selectedComplaint.assigned_department || "Unassigned"}</p>
                </div>

                <div className="detail-block">
                  <label>Status</label>
                  <p>{selectedComplaint.status || "N/A"}</p>
                </div>

                <div className="detail-block">
                  <label>Priority Level</label>
                  <p>{selectedComplaint.priority_level || "Not analyzed"}</p>
                </div>

                <div className="detail-block">
                  <label>Priority Score</label>
                  <p>
                    {selectedComplaint.priority_score != null
                      ? `${selectedComplaint.priority_score}/100`
                      : "Not analyzed"}
                  </p>
                </div>
              </div>

              <div className="detail-block">
                <label>Address</label>
                <p>{selectedComplaint.address || "Not available"}</p>
              </div>

              <div className="detail-block">
                <label>Coordinates</label>
                <p>
                  {selectedComplaint.latitude != null &&
                  selectedComplaint.longitude != null
                    ? `${selectedComplaint.latitude}, ${selectedComplaint.longitude}`
                    : "Location unavailable"}
                </p>
              </div>

              <div className="detail-block">
                <label>AI Priority Explanation</label>
                {selectedComplaint.priority_reasons ? (
                  <ul>
                    {(Array.isArray(selectedComplaint.priority_reasons)
                      ? selectedComplaint.priority_reasons
                      : [formatReasons(selectedComplaint.priority_reasons)]
                    ).map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Priority analysis has not been performed.</p>
                )}
              </div>

              <div className="detail-block">
                <label>Duplicate Detection</label>
                <p>
                  {selectedComplaint.duplicate_of
                    ? `Potential duplicate detected (similarity: ${
                        selectedComplaint.similarity_score ?? "N/A"
                      }).`
                    : "No duplicate recorded."}
                </p>
              </div>

              {selectedComplaint.image_url && (
                <div className="detail-block">
                  <label>Complaint Image</label>
                  <img
                    className="complaint-image"
                    src={selectedComplaint.image_url}
                    alt="Complaint evidence"
                  />
                </div>
              )}

              <div className="details-map">
                <h3>Complaint Location</h3>

                {selectedComplaint.latitude != null &&
                selectedComplaint.longitude != null ? (
                  <>
                    <iframe
                      title="Complaint location map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                        Number(selectedComplaint.longitude) - 0.005
                      }%2C${
                        Number(selectedComplaint.latitude) - 0.005
                      }%2C${
                        Number(selectedComplaint.longitude) + 0.005
                      }%2C${
                        Number(selectedComplaint.latitude) + 0.005
                      }&layer=mapnik&marker=${
                        selectedComplaint.latitude
                      }%2C${selectedComplaint.longitude}`}
                      loading="lazy"
                    />

                    <button
                      className="map-button"
                      onClick={() => openMap(selectedComplaint)}
                    >
                      ↗ Open in Google Maps
                    </button>
                  </>
                ) : (
                  <p>Location coordinates are not available.</p>
                )}
              </div>
            </div>

            <div className="details-footer">
              <button
                className="refresh-button"
                onClick={closeDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
