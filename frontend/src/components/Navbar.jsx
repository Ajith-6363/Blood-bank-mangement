import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, Bell, LogOut, User as UserIcon, Menu } from "lucide-react";
import api from "../services/api";

const Navbar = ({ onMobileNavToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(document.documentElement.getAttribute("data-theme") || "dark");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Fetch notifications if user is logged in
    let intervalId;
    if (user) {
      fetchNotifications();
      intervalId = setInterval(fetchNotifications, 30000); // Check every 30 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    // Handle click outside to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleLogoClick = () => {
    if (!user) {
      navigate("/");
    } else if (user.role === "admin" || user.role === "recipient") {
      navigate("/");
    } else {
      navigate("/dashboard");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="navbar" style={styles.header}>
      <div style={styles.left}>
        <button onClick={onMobileNavToggle} style={styles.hamburgerBtn} className="navbar-hamburger" aria-label="Toggle Navigation">
          <Menu size={24} />
        </button>
        <div style={{ ...styles.logo, cursor: "pointer" }} onClick={handleLogoClick}>
          <span style={styles.logoIcon}>🩸</span>
          <span style={styles.logoText}>LifeLink</span>
        </div>
      </div>

      <div style={styles.right}>
        {/* Theme Toggle */}
        <button onClick={toggleTheme} style={styles.iconButton} title="Toggle Theme">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications Dropdown */}
        {user && (
          <div ref={dropdownRef} style={styles.dropdownContainer}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={styles.iconButton}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="badge-red" style={styles.notifBadge}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="glass-card" style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <h4>Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} style={styles.markReadBtn}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={styles.dropdownList}>
                  {notifications.length === 0 ? (
                    <div style={styles.emptyNotif}>No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          ...styles.notifItem,
                          backgroundColor: n.is_read ? "transparent" : "var(--accent-red-muted)",
                        }}
                      >
                        <div style={styles.notifTitle}>{n.title}</div>
                        <div style={styles.notifMsg}>{n.message}</div>
                        <div style={styles.notifTime}>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Info & Logout */}
        {user && (
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user.profile_image ? (
                <img src={user.profile_image} alt="" style={styles.avatarImg} />
              ) : (
                <UserIcon size={16} />
              )}
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>{user.full_name}</div>
              <div style={styles.userRole}>{user.role.toUpperCase()}</div>
            </div>
            <button onClick={logout} style={styles.logoutBtn} title="Log Out">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

const styles = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "70px",
    backgroundColor: "var(--glass-bg)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    zIndex: 100,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  hamburgerBtn: {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-primary)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  logoIcon: {
    fontSize: "1.75rem",
  },
  logoText: {
    fontFamily: "var(--font-title)",
    fontSize: "1.5rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "var(--text-primary)",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
  },
  iconButton: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "background-color var(--transition-fast), color var(--transition-fast)",
    ":hover": {
      backgroundColor: "var(--bg-tertiary)",
      color: "var(--text-primary)",
    },
  },
  notifBadge: {
    position: "absolute",
    top: "0px",
    right: "0px",
    fontSize: "0.65rem",
    padding: "0.1rem 0.35rem",
    borderRadius: "9999px",
  },
  dropdownContainer: {
    position: "relative",
  },
  dropdown: {
    position: "absolute",
    top: "50px",
    right: 0,
    width: "320px",
    maxHeight: "400px",
    padding: "1rem 0",
    display: "flex",
    flexDirection: "column",
    zIndex: 200,
  },
  dropdownHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.25rem 0.75rem",
    borderBottom: "1px solid var(--border-color)",
  },
  markReadBtn: {
    background: "none",
    border: "none",
    color: "var(--accent-red)",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  dropdownList: {
    overflowY: "auto",
    flex: 1,
  },
  emptyNotif: {
    textAlign: "center",
    padding: "2rem 1.25rem",
    color: "var(--text-muted)",
    fontSize: "0.875rem",
  },
  notifItem: {
    padding: "0.75rem 1.25rem",
    borderBottom: "1px solid var(--border-color)",
    transition: "background-color var(--transition-fast)",
  },
  notifTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "0.125rem",
  },
  notifMsg: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    lineHeight: 1.3,
  },
  notifTime: {
    fontSize: "0.65rem",
    color: "var(--text-muted)",
    marginTop: "0.25rem",
    textAlign: "right",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    paddingLeft: "1.25rem",
    borderLeft: "1px solid var(--border-color)",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  userRole: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--accent-red)",
    letterSpacing: "0.05em",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color var(--transition-fast)",
    ":hover": {
      color: "var(--accent-red)",
    },
  },
};

export default Navbar;
