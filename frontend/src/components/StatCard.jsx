import React from "react";

const StatCard = ({ title, value, icon, description, trend, trendType = "neutral" }) => {
  const getTrendStyle = () => {
    switch (trendType) {
      case "positive":
        return { color: "var(--accent-green)", backgroundColor: "var(--accent-green-muted)" };
      case "negative":
        return { color: "var(--accent-red)", backgroundColor: "var(--accent-red-muted)" };
      default:
        return { color: "var(--text-secondary)", backgroundColor: "var(--bg-tertiary)" };
    }
  };

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        <div style={styles.iconContainer}>{icon}</div>
      </div>
      <div style={styles.value}>{value}</div>
      {(trend || description) && (
        <div style={styles.footer}>
          {trend && (
            <span style={{ ...styles.trend, ...getTrendStyle() }}>
              {trend}
            </span>
          )}
          {description && <span style={styles.desc}>{description}</span>}
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "130px",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--accent-red)",
  },
  value: {
    fontSize: "2rem",
    fontWeight: 800,
    fontFamily: "var(--font-title)",
    color: "var(--text-primary)",
    lineHeight: 1.2,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.75rem",
    fontSize: "0.75rem",
  },
  trend: {
    padding: "0.15rem 0.5rem",
    borderRadius: "6px",
    fontWeight: 600,
  },
  desc: {
    color: "var(--text-muted)",
  },
};

export default StatCard;
