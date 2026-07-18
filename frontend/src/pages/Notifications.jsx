import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Bell, Check, Trash2, Clock } from "lucide-react";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Notifications Center</h2>
          <p className="subtitle">View and manage system alerts and status updates</p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          >
            <Check size={16} /> Mark all read
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "2rem" }}>
            <div className="skeleton skeleton-text" style={{ width: "100%" }}></div>
            <div className="skeleton skeleton-text" style={{ width: "90%" }}></div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={styles.emptyState}>
            <Bell size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
            <h3>All Caught Up!</h3>
            <p style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
              No notifications or system alerts found.
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  ...styles.item,
                  borderLeftColor: n.is_read ? "transparent" : "var(--accent-red)",
                  backgroundColor: n.is_read ? "transparent" : "var(--accent-red-muted)",
                }}
              >
                <div style={styles.content}>
                  <div style={styles.titleRow}>
                    <h4 style={{ fontWeight: n.is_read ? 500 : 700 }}>{n.title}</h4>
                    <span style={styles.time}>
                      <Clock size={12} />
                      {new Date(n.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p style={styles.message}>{n.message}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    style={styles.actionBtn}
                    title="Mark as read"
                  >
                    <Check size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  emptyState: {
    padding: "4rem 2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    display: "flex",
    flexDirection: "column",
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.25rem 2rem",
    borderBottom: "1px solid var(--border-color)",
    borderLeft: "4px solid transparent",
    transition: "all var(--transition-fast)",
  },
  content: {
    flex: 1,
    paddingRight: "2rem",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.25rem",
  },
  time: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  message: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  actionBtn: {
    background: "none",
    border: "none",
    color: "var(--accent-green)",
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color var(--transition-fast)",
    ":hover": {
      backgroundColor: "var(--accent-green-muted)",
    },
  },
};

export default Notifications;
