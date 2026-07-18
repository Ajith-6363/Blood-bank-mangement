import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Heart, Droplet, Shield, Award, Sparkles } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handlePortalClick = (role) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div style={styles.container} className="fade-in">
      {/* Navbar with public navigation links */}
      <nav style={styles.navHeader}>
        <div style={styles.logo} onClick={() => navigate("/")}>
          <span style={styles.logoIcon}>🩸</span>
          <span style={styles.logoText}>LifeLink</span>
        </div>
        <div style={styles.navLinks}>
          <a href="#about" style={styles.navLink}>About</a>
          <a href="#portals" style={styles.navLink}>Portals</a>
          <a href="#contact" style={styles.navLink}>Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Every Drop Saves Lives. <br/>
            <span className="text-gradient-red">Centralized SaaS Blood Network</span>
          </h1>
          <p style={styles.heroSub}>
            Welcome to LifeLink. Real-time refrigerated inventory tracking, AI-powered donor matching, emergency request prioritization, and customized coordination dashboards.
          </p>
        </div>
      </header>

      {/* Portals Section */}
      <section id="portals" style={styles.section}>
        <h2 style={styles.sectionTitle}>Access Portals</h2>
        <div style={styles.portalsGrid}>
          {/* Donor */}
          <div style={styles.portalCard} className="glass-card">
            <div style={{ ...styles.iconBg, backgroundColor: "var(--accent-red-muted)" }}>
              <Heart size={24} style={{ color: "var(--accent-red)" }} />
            </div>
            <h3 style={styles.portalTitle}>Donor Portal</h3>
            <p style={styles.portalDesc}>Schedule blood donation appointments, check eligibility criteria, and view your certificate history.</p>
            <button onClick={() => handlePortalClick("donor")} className="btn btn-primary" style={{ ...styles.btn, backgroundColor: "var(--accent-red)" }}>
              Donor Access &rarr;
            </button>
          </div>

          {/* Recipient */}
          <div style={styles.portalCard} className="glass-card">
            <div style={{ ...styles.iconBg, backgroundColor: "rgba(139, 92, 246, 0.15)" }}>
              <Droplet size={24} style={{ color: "#8b5cf6" }} />
            </div>
            <h3 style={styles.portalTitle}>Recipient Portal</h3>
            <p style={styles.portalDesc}>Register emergency blood request tickets and check real-time compatibility statuses.</p>
            <button onClick={() => handlePortalClick("recipient")} className="btn btn-primary" style={{ ...styles.btn, backgroundColor: "#8b5cf6" }}>
              Recipient Access &rarr;
            </button>
          </div>

          {/* Hospital */}
          <div style={styles.portalCard} className="glass-card">
            <div style={{ ...styles.iconBg, backgroundColor: "rgba(59, 130, 246, 0.15)" }}>
              <Shield size={24} style={{ color: "#3b82f6" }} />
            </div>
            <h3 style={styles.portalTitle}>Hospital Operations</h3>
            <p style={styles.portalDesc}>Submit bulk blood unit requests, review refrigerator stocks, and manage dispatch transit logs.</p>
            <button onClick={() => handlePortalClick("hospital")} className="btn btn-primary" style={{ ...styles.btn, backgroundColor: "#3b82f6" }}>
              Hospital Access &rarr;
            </button>
          </div>

          {/* Volunteer */}
          <div style={styles.portalCard} className="glass-card">
            <div style={{ ...styles.iconBg, backgroundColor: "var(--accent-orange-muted)" }}>
              <Award size={24} style={{ color: "var(--accent-orange)" }} />
            </div>
            <h3 style={styles.portalTitle}>Volunteer Center</h3>
            <p style={styles.portalDesc}>Check in incoming donors, screen bio-metrics, and coordinate blood drive logistics.</p>
            <button onClick={() => handlePortalClick("volunteer")} className="btn btn-primary" style={{ ...styles.btn, backgroundColor: "var(--accent-orange)" }}>
              Volunteer Access &rarr;
            </button>
          </div>

          {/* Admin */}
          <div style={styles.portalCard} className="glass-card">
            <div style={{ ...styles.iconBg, backgroundColor: "var(--accent-green-muted)" }}>
              <Sparkles size={24} style={{ color: "var(--accent-green)" }} />
            </div>
            <h3 style={styles.portalTitle}>Central Administration</h3>
            <p style={styles.portalDesc}>Oversee users, verify organizations, view detailed audit logs, and consult the AI chatbot assistant.</p>
            <button onClick={() => handlePortalClick("admin")} className="btn btn-primary" style={{ ...styles.btn, backgroundColor: "var(--accent-green)" }}>
              Admin Access &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* Aesthetic Bottom Section / Quick Portal Switcher Toolbar */}
      <section style={styles.bottomToolbarSection}>
        <div className="glass-card" style={styles.bottomToolbarCard}>
          <h4 style={styles.toolbarTitle}>Quick Portal Authentication</h4>
          <p style={styles.toolbarSubtitle}>Select a role below to log in directly into your interface dashboard</p>
          <div style={styles.toolbarLinks}>
            <button onClick={() => handlePortalClick("donor")} style={{ ...styles.toolbarBtn, borderColor: "var(--accent-red)", color: "var(--accent-red)" }}>
              Donor Login
            </button>
            <button onClick={() => handlePortalClick("recipient")} style={{ ...styles.toolbarBtn, borderColor: "#8b5cf6", color: "#8b5cf6" }}>
              Recipient Login
            </button>
            <button onClick={() => handlePortalClick("hospital")} style={{ ...styles.toolbarBtn, borderColor: "#3b82f6", color: "#3b82f6" }}>
              Hospital Login
            </button>
            <button onClick={() => handlePortalClick("volunteer")} style={{ ...styles.toolbarBtn, borderColor: "var(--accent-orange)", color: "var(--accent-orange)" }}>
              Volunteer Login
            </button>
            <button onClick={() => handlePortalClick("admin")} style={{ ...styles.toolbarBtn, borderColor: "var(--accent-green)", color: "var(--accent-green)" }}>
              Admin Login
            </button>
          </div>
        </div>
      </section>

      <footer style={styles.footer} id="contact">
        <p>© {new Date().getFullYear()} LifeLink Blood Bank Management System. All rights reserved.</p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
          Contact us at support@lifelink.org | Real-Time Refrigerator Cold Chain Monitoring
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    paddingTop: "80px",
  },
  navHeader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "80px",
    backgroundColor: "var(--glass-bg)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 4rem",
    zIndex: 1000,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  logoIcon: {
    fontSize: "2rem",
  },
  logoText: {
    fontFamily: "var(--font-title)",
    fontSize: "1.6rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "2rem",
  },
  navLink: {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    textDecoration: "none",
    transition: "color var(--transition-fast)",
    cursor: "pointer",
  },
  heroSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "4rem 2rem 2rem 2rem",
    maxWidth: "800px",
    margin: "0 auto",
  },
  heroContent: {
    width: "100%",
  },
  heroTitle: {
    fontSize: "3rem",
    fontWeight: 800,
    lineHeight: 1.1,
    fontFamily: "var(--font-title)",
    letterSpacing: "-0.03em",
  },
  heroSub: {
    fontSize: "1.05rem",
    color: "var(--text-secondary)",
    marginTop: "1.5rem",
    lineHeight: 1.6,
  },
  section: {
    padding: "3rem 2rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  sectionTitle: {
    fontFamily: "var(--font-title)",
    fontSize: "1.75rem",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "2.5rem",
  },
  portalsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.5rem",
  },
  portalCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "2rem",
    justifyContent: "space-between",
    height: "100%",
  },
  iconBg: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1.25rem",
  },
  portalTitle: {
    fontFamily: "var(--font-title)",
    fontSize: "1.25rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
  },
  portalDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginBottom: "1.5rem",
    lineHeight: 1.5,
    minHeight: "45px",
  },
  btn: {
    width: "100%",
    border: "none",
    boxShadow: "none",
  },
  bottomToolbarSection: {
    padding: "3rem 2rem",
    maxWidth: "800px",
    margin: "0 auto",
  },
  bottomToolbarCard: {
    padding: "2rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  toolbarTitle: {
    fontFamily: "var(--font-title)",
    fontSize: "1.2rem",
    fontWeight: 700,
    marginBottom: "0.25rem",
  },
  toolbarSubtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginBottom: "1.5rem",
  },
  toolbarLinks: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  toolbarBtn: {
    backgroundColor: "transparent",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "0.4rem 0.8rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.15s ease, background-color 0.15s ease",
    outline: "none",
  },
  footer: {
    padding: "3rem 2rem",
    borderTop: "1px solid var(--border-color)",
    textAlign: "center",
    backgroundColor: "var(--bg-secondary)",
    marginTop: "4rem",
  },
};

export default Home;
