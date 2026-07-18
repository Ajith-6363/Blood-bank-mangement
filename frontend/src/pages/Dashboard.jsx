import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import {
  Users,
  Calendar,
  Activity,
  AlertTriangle,
  Heart,
  FileText,
  Clock,
  Award,
  CheckCircle,
  TrendingUp,
  Hospital,
  ShieldAlert,
  Droplet,
  Send,
  Sparkles,
  UserCheck,
  CheckSquare
} from "lucide-react";
import api from "../services/api";
import StatCard from "../components/StatCard";

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const { stockUpdateTrigger, notificationTrigger } = useSocket();
  const navigate = useNavigate();
  
  const [adminStats, setAdminStats] = useState(null);
  const [donorStats, setDonorStats] = useState(null);
  const [recipientStats, setRecipientStats] = useState([]);
  const [hospitalStats, setHospitalStats] = useState([]);
  const [volunteerStats, setVolunteerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // AI Assistant Chat state
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantChat, setAssistantChat] = useState([
    { sender: "ai", text: "Hello! I am your AI Assistant. Ask me anything about stock inventory, eligibility, or pending requests. Example: 'What is our current O- stock?'" }
  ]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [forecastData, setForecastData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user, stockUpdateTrigger, notificationTrigger]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (user.role === "admin") {
        const [dashRes, forecastRes] = await Promise.all([
          api.get("/analytics/dashboard"),
          api.get("/ai/forecast")
        ]);
        setAdminStats(dashRes.data);
        setForecastData(forecastRes.data);
      } else if (user.role === "donor") {
        const [apptsRes, eligRes] = await Promise.all([
          api.get("/donations/my"),
          api.get("/donations/eligibility-check")
        ]);
        setDonorStats({
          appointments: apptsRes.data,
          eligibility: eligRes.data
        });
      } else if (user.role === "recipient") {
        const response = await api.get("/requests/my");
        setRecipientStats(response.data);
      } else if (user.role === "hospital") {
        const response = await api.get("/requests/my");
        setHospitalStats(response.data);
      } else if (user.role === "volunteer") {
        // Volunteers see scheduled donations to help manage drives
        const [apptsRes, stockRes] = await Promise.all([
          api.get("/donations/all?status=scheduled"),
          api.get("/stock")
        ]);
        setVolunteerStats({
          scheduledAppointments: apptsRes.data,
          stock: stockRes.data
        });
      }
    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantSubmit = async (e) => {
    e.preventDefault();
    if (!assistantQuery.trim()) return;
    const userQuery = assistantQuery;
    setAssistantChat((prev) => [...prev, { sender: "user", text: userQuery }]);
    setAssistantQuery("");
    setAssistantLoading(true);
    try {
      const response = await api.post("/ai/assistant", { query: userQuery });
      setAssistantChat((prev) => [...prev, { sender: "ai", text: response.data.answer }]);
    } catch (err) {
      setAssistantChat((prev) => [...prev, { sender: "ai", text: "Unable to parse request. Please verify connection to the server." }]);
    } finally {
      setAssistantLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="skeleton skeleton-title" style={{ width: "300px" }}></div>
        <div className="grid-cols-4" style={{ marginBottom: "2rem" }}>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
        <div className="grid-cols-2">
          <div className="skeleton skeleton-card" style={{ height: "300px" }}></div>
          <div className="skeleton skeleton-card" style={{ height: "300px" }}></div>
        </div>
      </div>
    );
  }

  // --- ADMIN RENDER ---
  if (user.role === "admin") {
    const { summary, low_stock_alerts, blood_distribution, monthly_donation_trends, recent_activities, top_donors } = adminStats;

    // Blood stock chart data
    const stockChartData = {
      labels: Object.keys(blood_distribution),
      datasets: [
        {
          label: "Available Blood Units",
          data: Object.values(blood_distribution),
          backgroundColor: Object.values(blood_distribution).map((val) =>
            val < 5 ? "rgba(225, 29, 72, 0.7)" : "rgba(59, 130, 246, 0.7)"
          ),
          borderColor: Object.values(blood_distribution).map((val) =>
            val < 5 ? "var(--accent-red)" : "#3b82f6"
          ),
          borderWidth: 1,
        },
      ],
    };

    // AI Predictive Forecasting Chart
    const forecastChartData = forecastData ? {
      labels: Object.keys(forecastData),
      datasets: [
        {
          label: "Predicted Target Demand (Bags)",
          data: Object.values(forecastData).map(v => v.predicted_bags),
          backgroundColor: "rgba(245, 158, 11, 0.7)",
          borderColor: "var(--accent-orange)",
          borderWidth: 1,
        },
        {
          label: "Historical Monthly Avg",
          data: Object.values(forecastData).map(v => v.historical_monthly_avg),
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderColor: "var(--accent-green)",
          borderWidth: 1,
        }
      ]
    } : null;

    // Donation trends chart data
    const trendsChartData = {
      labels: monthly_donation_trends.map((t) => t.month),
      datasets: [
        {
          label: "Completed Donations",
          data: monthly_donation_trends.map((t) => t.completed_donations),
          fill: true,
          backgroundColor: "rgba(225, 29, 72, 0.15)",
          borderColor: "var(--accent-red)",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "var(--accent-red)",
        },
      ],
    };

    return (
      <div className="fade-in">
        <div style={styles.dashboardHeader}>
          <h2>Welcome back, Dr. Miller</h2>
          <p style={styles.subtitle}>LifeLink Blood Bank Central Control Panel</p>
        </div>

        {/* Low Stock Banner Alert */}
        {low_stock_alerts.length > 0 && (
          <div className="alert alert-danger" style={{ marginBottom: "2rem" }}>
            <ShieldAlert size={20} style={{ color: "var(--accent-red)" }} />
            <div>
              <strong>Critical Inventory Warning:</strong> Low units available for blood groups:{" "}
              {low_stock_alerts.map((alert) => `${alert.blood_group} (${alert.units} bags)`).join(", ")}. Please schedule compatible donors.
            </div>
          </div>
        )}

        {/* Summary Widgets */}
        <div className="grid-cols-4" style={{ marginBottom: "2rem" }}>
          <StatCard
            title="Total Donors"
            value={summary.total_donors}
            icon={<Users size={20} />}
            description="Registered volunteer network"
          />
          <StatCard
            title="Hospitals Served"
            value={summary.total_hospitals}
            icon={<Hospital size={20} />}
            description="Partner clinics & centers"
          />
          <StatCard
            title="Today's Donations"
            value={summary.today_donations}
            icon={<Heart size={20} />}
            description="Completed whole blood bags"
            trend={summary.today_donations > 0 ? "+New" : "0"}
            trendType={summary.today_donations > 0 ? "positive" : "neutral"}
          />
          <StatCard
            title="Active Blood Requests"
            value={summary.pending_requests}
            icon={<FileText size={20} />}
            description="Awaiting administrator action"
            trend={summary.pending_requests > 5 ? "High" : "Normal"}
            trendType={summary.pending_requests > 5 ? "negative" : "positive"}
          />
        </div>

        {/* Graphical Analytics */}
        <div className="grid-cols-2" style={{ marginBottom: "2rem" }}>
          <div className="glass-card">
            <h3 style={styles.chartTitle}>Refrigerated Inventory by Blood Group</h3>
            <div className="chart-box">
              <Bar
                data={stockChartData}
                options={{
                  responsive: true,
                  scales: {
                    y: { grid: { color: "rgba(255, 255, 255, 0.05)" } },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>

          <div className="glass-card">
            <h3 style={styles.chartTitle}>AI Predictive Demand Forecast (Next 30 Days)</h3>
            <div className="chart-box">
              {forecastChartData && (
                <Bar
                  data={forecastChartData}
                  options={{
                    responsive: true,
                    scales: {
                      y: { grid: { color: "rgba(255, 255, 255, 0.05)" } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* AI Admin Assistant and Activity */}
        <div className="grid-cols-2" style={{ marginBottom: "2rem" }}>
          {/* AI Assistant Chat Panel */}
          <div className="glass-card" style={styles.assistantCard}>
            <div style={styles.assistantHeader}>
              <Sparkles size={18} style={{ color: "var(--accent-orange)" }} />
              <h3 style={{ margin: 0, fontSize: "1rem" }}>AI Assistant Chat</h3>
            </div>
            <div style={styles.chatArea}>
              {assistantChat.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.chatBubble,
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    backgroundColor: msg.sender === "user" ? "var(--accent-red)" : "var(--bg-tertiary)",
                    color: "#ffffff"
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {assistantLoading && (
                <div style={{ ...styles.chatBubble, alignSelf: "flex-start", backgroundColor: "var(--bg-tertiary)" }}>
                  Thinking...
                </div>
              )}
            </div>
            <form onSubmit={handleAssistantSubmit} style={styles.chatForm}>
              <input
                type="text"
                placeholder="Ask about stock, donors, compatibility..."
                value={assistantQuery}
                onChange={(e) => setAssistantQuery(e.target.value)}
                style={styles.chatInput}
              />
              <button type="submit" style={styles.chatSendBtn}>
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Recent Activity Feed */}
          <div className="glass-card">
            <h3 style={styles.chartTitle}>Recent Network Activities</h3>
            <div style={styles.activityFeed}>
              {recent_activities.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No activities recorded.</p>
              ) : (
                recent_activities.map((act) => (
                  <div key={`${act.type}-${act.id}`} style={styles.activityItem}>
                    <div style={styles.activityIcon}>
                      {act.type === "audit" && <TrendingUp size={16} />}
                      {act.type === "request" && <FileText size={16} style={{ color: "var(--accent-orange)" }} />}
                      {act.type === "donation" && <Heart size={16} style={{ color: "var(--accent-red)" }} />}
                    </div>
                    <div style={styles.activityTextRow}>
                      <span style={styles.activityMessage}>{act.message}</span>
                      <span style={styles.activityTime}>
                        {new Date(act.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Donors Panel */}
        <div className="glass-card" style={{ marginBottom: "2rem" }}>
          <h3 style={styles.chartTitle}>Top Lifesavers</h3>
          <div className="table-container" style={{ border: "none" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Donor Name</th>
                  <th>Group</th>
                  <th>Completed Donations</th>
                </tr>
              </thead>
              <tbody>
                {top_donors.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      No donations completed yet.
                    </td>
                  </tr>
                ) : (
                  top_donors.map((donor) => (
                    <tr key={donor.id}>
                      <td>
                        <strong>{donor.full_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{donor.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-red">{donor.blood_group}</span>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--accent-green)", fontWeight: 600 }}>
                          <Award size={16} /> {donor.donation_count}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- DONOR RENDER ---
  if (user.role === "donor") {
    const { appointments, eligibility } = donorStats;
    const completedAppts = appointments.filter((a) => a.status === "completed");

    return (
      <div className="fade-in">
        <div style={styles.dashboardHeader}>
          <h2>Donor Portal</h2>
          <p style={styles.subtitle}>Track your contribution and schedule your next lifesaving donation.</p>
        </div>

        {/* Eligibility Check Display */}
        <div className="glass-card" style={{ ...styles.eligibilityCard, borderColor: eligibility.eligible ? "var(--accent-green)" : "var(--accent-orange)" }}>
          <div style={styles.eligibilityHeader}>
            <div style={styles.eligibilityTitleCol}>
              <h3 style={{ color: eligibility.eligible ? "var(--accent-green)" : "var(--accent-orange)" }}>
                {eligibility.eligible ? "You are Eligible!" : "Not Eligible Today"}
              </h3>
              <p style={{ ...styles.subtitle, marginTop: "0.25rem" }}>{eligibility.reason}</p>
            </div>
            <div style={{ ...styles.eligIconBg, backgroundColor: eligibility.eligible ? "var(--accent-green-muted)" : "var(--accent-orange-muted)" }}>
              {eligibility.eligible ? <CheckCircle size={32} style={{ color: "var(--accent-green)" }} /> : <Clock size={32} style={{ color: "var(--accent-orange)" }} />}
            </div>
          </div>
          {eligibility.next_eligible_date && !eligibility.eligible && (
            <div style={styles.countdownRow}>
              <span>Estimated next donation date: <strong>{new Date(eligibility.next_eligible_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
            </div>
          )}
        </div>

        <div className="grid-cols-3" style={{ marginBottom: "2rem" }}>
          <StatCard
            title="My Blood Type"
            value={user.blood_group || "N/A"}
            icon={<Droplet size={20} />}
            description="Biological group recorded"
          />
          <StatCard
            title="Total Donations"
            value={completedAppts.length}
            icon={<Heart size={20} />}
            description="Whole blood units donated"
            trend={completedAppts.length > 0 ? "Active Donor" : "Inactive"}
            trendType={completedAppts.length > 0 ? "positive" : "neutral"}
          />
          <StatCard
            title="Next Eligibility Date"
            value={eligibility.next_eligible_date ? new Date(eligibility.next_eligible_date).toLocaleDateString([], { month: "short", day: "numeric" }) : "Immediate"}
            icon={<Calendar size={20} />}
            description="56 days minimum interval wait"
          />
        </div>

        {/* Appointments List */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={styles.chartTitle}>My Donations & Appointments</h3>
            <button
              onClick={() => navigate("/appointments?schedule=true")}
              className="btn btn-primary btn-sm"
              disabled={!eligibility.eligible}
            >
              Schedule Donation
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Blood Group</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Health Summary</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      No appointments scheduled. Help save lives by scheduling one today!
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt) => (
                    <tr key={appt.id}>
                      <td>
                        <strong>{new Date(appt.appointment_date).toLocaleDateString()}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(appt.appointment_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-red">{appt.blood_group}</span>
                      </td>
                      <td>{appt.quantity} Bag(s)</td>
                      <td>
                        <span
                          className={`badge ${
                            appt.status === "completed"
                              ? "badge-green"
                              : appt.status === "scheduled"
                              ? "badge-orange"
                              : appt.status === "approved"
                              ? "badge-green"
                              : "badge-muted"
                          }`}
                        >
                          {appt.status}
                        </span>
                      </td>
                      <td>
                        {appt.status === "completed" ? (
                          <div style={{ fontSize: "0.8rem" }}>
                            <span>HB: <strong>{appt.hemoglobin_level || "N/A"} g/dL</strong></span> |{" "}
                            <span>BP: <strong>{appt.blood_pressure || "N/A"}</strong></span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>Awaiting check-in</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- RECIPIENT RENDER ---
  if (user.role === "recipient") {
    return (
      <div className="fade-in">
        <div style={styles.dashboardHeader}>
          <h2>Recipient Portal</h2>
          <p style={styles.subtitle}>Track your request tickets and submit emergency requests.</p>
        </div>

        <div className="grid-cols-4" style={{ marginBottom: "2rem" }}>
          <StatCard
            title="My Blood Type"
            value={user.blood_group || "N/A"}
            icon={<Droplet size={20} />}
            description="Target compatibility group"
          />
          <StatCard
            title="Submitted Requests"
            value={recipientStats.length}
            icon={<FileText size={20} />}
            description="Total requests registered"
          />
          <StatCard
            title="Pending Approval"
            value={recipientStats.filter((r) => r.status === "pending").length}
            icon={<Clock size={20} />}
            description="Under review by director"
          />
          <StatCard
            title="Fulfilled Units"
            value={recipientStats.filter((r) => r.status === "fulfilled").length}
            icon={<CheckCircle size={20} />}
            description="Dispatched and delivered"
          />
        </div>

        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={styles.chartTitle}>My Request Tickets</h3>
            <button onClick={() => navigate("/requests?create=true")} className="btn btn-primary btn-sm">
              Request Blood Units
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Blood Group</th>
                  <th>Quantity</th>
                  <th>Urgency</th>
                  <th>Expected Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recipientStats.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      No active blood requests.
                    </td>
                  </tr>
                ) : (
                  recipientStats.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.patient_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Age: {req.patient_age} | {req.hospital_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-red">{req.blood_group}</span>
                      </td>
                      <td>{req.quantity} unit(s)</td>
                      <td>
                        <span className={`badge ${req.urgency === "critical" ? "badge-red" : req.urgency === "urgent" ? "badge-orange" : "badge-muted"}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td>{new Date(req.expected_delivery).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            req.status === "fulfilled"
                              ? "badge-green"
                              : req.status === "pending"
                              ? "badge-orange"
                              : req.status === "approved"
                              ? "badge-green"
                              : "badge-red"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- HOSPITAL RENDER ---
  if (user.role === "hospital") {
    return (
      <div className="fade-in">
        <div style={styles.dashboardHeader}>
          <h2>Hospital Operations Portal</h2>
          <p style={styles.subtitle}>Request bulk bags and monitor compatible refrigerator stock level metrics.</p>
        </div>

        {!user.is_verified && (
          <div className="alert alert-danger" style={{ marginBottom: "2rem" }}>
            <ShieldAlert size={20} style={{ color: "var(--accent-red)" }} />
            <div>
              <strong>Account Verification Pending:</strong> Your hospital credentials are currently under review by the blood bank administrator. You will be able to submit request tickets once verified by the admin.
            </div>
          </div>
        )}

        <div className="grid-cols-3" style={{ marginBottom: "2rem" }}>
          <StatCard
            title="Bulk Requests Sent"
            value={hospitalStats.length}
            icon={<FileText size={20} />}
            description="Total hospitals requests"
          />
          <StatCard
            title="Fulfilled Units"
            value={hospitalStats.filter((r) => r.status === "fulfilled").length}
            icon={<CheckCircle size={20} />}
            description="Received blood bags"
          />
          <StatCard
            title="Pending review"
            value={hospitalStats.filter((r) => r.status === "pending").length}
            icon={<Clock size={20} />}
            description="In queue processing"
          />
        </div>

        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={styles.chartTitle}>Hospital Demand Queue</h3>
            <button onClick={() => navigate("/requests?create=true")} className="btn btn-primary btn-sm" disabled={!user.is_verified}>
              Create Bulk Request
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Patient/Batch Name</th>
                  <th>Blood Group</th>
                  <th>Quantity</th>
                  <th>Urgency</th>
                  <th>Target Timeline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitalStats.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      No active requests submitted.
                    </td>
                  </tr>
                ) : (
                  hospitalStats.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.patient_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Doctor: {req.doctor_name || "N/A"}</div>
                      </td>
                      <td>
                        <span className="badge badge-red">{req.blood_group}</span>
                      </td>
                      <td>{req.quantity} bag(s)</td>
                      <td>
                        <span className={`badge ${req.urgency === "critical" ? "badge-red" : req.urgency === "urgent" ? "badge-orange" : "badge-muted"}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td>{new Date(req.expected_delivery).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            req.status === "fulfilled"
                              ? "badge-green"
                              : req.status === "pending"
                              ? "badge-orange"
                              : req.status === "approved"
                              ? "badge-green"
                              : "badge-red"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- VOLUNTEER RENDER ---
  if (user.role === "volunteer") {
    const { scheduledAppointments, stock } = volunteerStats;

    return (
      <div className="fade-in">
        <div style={styles.dashboardHeader}>
          <h2>Volunteer Coordination Center</h2>
          <p style={styles.subtitle}>Help welcome and screen incoming donors, check scheduled appointments, and manage local donation drives.</p>
        </div>

        <div className="grid-cols-3" style={{ marginBottom: "2rem" }}>
          <StatCard
            title="Scheduled Donors Today"
            value={scheduledAppointments.length}
            icon={<Calendar size={20} />}
            description="Appointments awaiting check-in"
            trend="Active Queue"
            trendType="positive"
          />
          <StatCard
            title="Total Active Inventory"
            value={stock?.total_available_units || 0}
            icon={<Droplet size={20} />}
            description="Refrigerated blood units"
          />
          <StatCard
            title="Coordinator Action Status"
            value="Ready"
            icon={<UserCheck size={20} />}
            description="Drive supervisor check-in active"
          />
        </div>

        {/* Scheduled Appointments Drive Checklist */}
        <div className="glass-card" style={{ marginBottom: "2rem" }}>
          <h3 style={styles.chartTitle}>Today's Donation Drive Check-In Queue</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Appointment Time</th>
                  <th>Blood Group</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      No scheduled appointments to check in right now.
                    </td>
                  </tr>
                ) : (
                  scheduledAppointments.map((appt) => (
                    <tr key={appt.id}>
                      <td>
                        <strong>{new Date(appt.appointment_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(appt.appointment_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-red">{appt.blood_group}</span>
                      </td>
                      <td>{appt.quantity} unit(s)</td>
                      <td>
                        <span className="badge badge-orange">{appt.status}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => navigate("/appointments")}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          <CheckSquare size={14} style={{ marginRight: "0.25rem" }} />
                          Go to Screening
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const styles = {
  loadingContainer: {
    padding: "2rem",
  },
  dashboardHeader: {
    marginBottom: "2rem",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
  },
  chartTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "1.25rem",
    fontFamily: "var(--font-title)",
  },
  activityFeed: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    paddingBottom: "0.75rem",
    borderBottom: "1px solid var(--border-color)",
  },
  activityIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-secondary)",
  },
  activityTextRow: {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.85rem",
  },
  activityMessage: {
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  activityTime: {
    color: "var(--text-muted)",
    fontSize: "0.75rem",
  },
  eligibilityCard: {
    borderLeft: "5px solid var(--accent-green)",
    marginBottom: "2rem",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
  },
  eligibilityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eligibilityTitleCol: {
    display: "flex",
    flexDirection: "column",
  },
  eligIconBg: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
  },
  countdownRow: {
    marginTop: "1rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid var(--border-color)",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  // AI Assistant Styles
  assistantCard: {
    display: "flex",
    flexDirection: "column",
    height: "400px",
  },
  assistantHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    paddingBottom: "0.75rem",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "1rem",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingRight: "0.5rem",
    marginBottom: "1rem",
  },
  chatBubble: {
    maxWidth: "80%",
    padding: "0.6rem 1rem",
    borderRadius: "12px",
    fontSize: "0.85rem",
    lineHeight: "1.4",
  },
  chatForm: {
    display: "flex",
    gap: "0.5rem",
  },
  chatInput: {
    flex: 1,
    padding: "0.6rem 0.8rem",
    backgroundColor: "var(--input-bg)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    outline: "none",
  },
  chatSendBtn: {
    backgroundColor: "var(--accent-red)",
    border: "none",
    borderRadius: "8px",
    width: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    cursor: "pointer",
  }
};

export default Dashboard;
