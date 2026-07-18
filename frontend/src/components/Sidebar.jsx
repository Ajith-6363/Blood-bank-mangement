import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Droplet,
  Calendar,
  FileText,
  Users,
  History,
  User as UserIcon,
  LogOut,
  X,
  Home as HomeIcon
} from "lucide-react";

const Sidebar = ({ isMobileOpen, onClose }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  // Custom menu items mapped to roles
  const getMenuItems = () => {
    const commonItems = [
      { path: "/profile", label: "My Profile", icon: <UserIcon size={20} /> }
    ];

    const homeRedirectItem = { path: "/", label: "Public Home", icon: <HomeIcon size={20} /> };

    switch (user.role) {
      case "admin":
        return [
          { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
          { path: "/stock", label: "Blood Inventory", icon: <Droplet size={20} /> },
          { path: "/appointments", label: "Appointments", icon: <Calendar size={20} /> },
          { path: "/requests", label: "Blood Requests", icon: <FileText size={20} /> },
          { path: "/users", label: "Manage Users", icon: <Users size={20} /> },
          { path: "/audit-logs", label: "Audit Trail", icon: <History size={20} /> },
          homeRedirectItem,
          ...commonItems
        ];
      case "donor":
        return [
          { path: "/dashboard", label: "Donor Dashboard", icon: <LayoutDashboard size={20} /> },
          { path: "/appointments", label: "My Donations", icon: <Calendar size={20} /> },
          ...commonItems
        ];
      case "recipient":
        return [
          { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
          { path: "/requests", label: "My Requests", icon: <FileText size={20} /> },
          homeRedirectItem,
          ...commonItems
        ];
      case "hospital":
        return [
          { path: "/dashboard", label: "Hospital Portal", icon: <LayoutDashboard size={20} /> },
          { path: "/stock", label: "Check Stock", icon: <Droplet size={20} /> },
          { path: "/requests", label: "Bulk Requests", icon: <FileText size={20} /> },
          ...commonItems
        ];
      case "volunteer":
        return [
          { path: "/dashboard", label: "Volunteer Dashboard", icon: <LayoutDashboard size={20} /> },
          { path: "/appointments", label: "Donor Screening", icon: <Calendar size={20} /> },
          ...commonItems
        ];
      default:
        return commonItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div style={styles.overlay} onClick={onClose}></div>
      )}

      <aside
        style={{
          ...styles.sidebar,
          transform: isMobileOpen ? "translateX(0)" : "",
        }}
        className={isMobileOpen ? "mobile-open" : ""}
      >
        {/* Mobile close button */}
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close Sidebar">
          <X size={24} />
        </button>

        {/* Sidebar brand header */}
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🩸</span>
          <span style={styles.brandText}>LifeLink</span>
        </div>

        {/* Nav Links */}
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                ...styles.link,
                backgroundColor: isActive ? "var(--accent-red-muted)" : "transparent",
                color: isActive ? "var(--accent-red)" : "var(--text-secondary)",
                borderColor: isActive ? "var(--accent-red)" : "transparent",
              })}
            >
              <span style={styles.linkIcon}>{item.icon}</span>
              <span style={styles.linkLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div style={styles.footer}>
          <button onClick={logout} style={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const styles = {
  sidebar: {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    width: "260px",
    backgroundColor: "var(--bg-secondary)",
    borderRight: "1px solid var(--border-color)",
    display: "flex",
    flexDirection: "column",
    paddingTop: "70px",
    zIndex: 90,
    transition: "transform var(--transition-normal)",
  },
  overlay: {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    zIndex: 89,
  },
  closeBtn: {
    display: "none",
    position: "absolute",
    top: "1.25rem",
    right: "1.25rem",
    background: "none",
    border: "none",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "2rem 1.5rem",
    borderBottom: "1px solid var(--border-color)",
  },
  brandIcon: {
    fontSize: "1.75rem",
  },
  brandText: {
    fontFamily: "var(--font-title)",
    fontSize: "1.5rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "var(--text-primary)",
  },
  nav: {
    flex: 1,
    padding: "1.5rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.875rem 1rem",
    borderRadius: "var(--border-radius-md)",
    borderLeft: "3px solid transparent",
    fontWeight: 500,
    transition: "all var(--transition-fast)",
  },
  linkIcon: {
    display: "flex",
    alignItems: "center",
  },
  linkLabel: {
    fontSize: "0.95rem",
  },
  footer: {
    padding: "1.5rem 1rem",
    borderTop: "1px solid var(--border-color)",
  },
  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.875rem 1rem",
    borderRadius: "var(--border-radius-md)",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontWeight: 500,
    textAlign: "left",
    transition: "all var(--transition-fast)",
    ":hover": {
      color: "var(--accent-red)",
      backgroundColor: "rgba(225, 29, 72, 0.05)",
    },
  },
};

export default Sidebar;
