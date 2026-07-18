import React, { useState, useEffect } from "react";
import api from "../services/api";
import { History, ShieldAlert, Search } from "lucide-react";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get("/analytics/audit-logs");
      setLogs(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch system logs.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>System Audit Trail</h2>
          <p className="subtitle">Trace database writes and administrator adjustments</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Search Filter */}
      <div className="glass-card" style={styles.searchCard}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search logs by action or administrator..."
            className="form-control"
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action Description</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>
                    <div className="skeleton skeleton-text" style={{ width: "80%", margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{log.admin_name}</span>
                    </td>
                    <td>
                      <span style={styles.actionText}>{log.action}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>
                        {log.ip_address || "127.0.0.1"}
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
};

const styles = {
  searchCard: {
    padding: "1rem",
    marginBottom: "1.5rem",
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "1rem",
    color: "var(--text-muted)",
  },
  searchInput: {
    paddingLeft: "2.75rem",
  },
  actionText: {
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    lineHeight: 1.4,
  },
};

export default AuditLogs;
