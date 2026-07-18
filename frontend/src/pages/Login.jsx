import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Mail, AlertTriangle, CheckCircle } from "lucide-react";
import api from "../services/api";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  otp: z.string().length(6, { message: "OTP must be exactly 6 digits" }),
  new_password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState("login"); // 'login', 'forgot', 'reset'
  const [submitting, setSubmitting] = useState(false);

  const roleParam = searchParams.get("role") || "";
  const targetRole = roleParam.toLowerCase();

  // Form hooks
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors }
  } = useForm({ resolver: zodResolver(loginSchema) });

  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  // Handle Login
  const onLogin = async (data) => {
    setError("");
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Forgot Password
  const onForgot = async (data) => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await api.post("/auth/forgot-password", { email: data.email });
      setSuccess(response.data.message);
      setTimeout(() => {
        setMode("reset");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password
  const onReset = async (data) => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await api.post("/auth/reset-password", {
        email: data.email,
        otp: data.otp,
        new_password: data.new_password,
      });
      setSuccess(response.data.message);
      setTimeout(() => {
        setMode("login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Incorrect OTP code or expired session.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSessionExpired = searchParams.get("session_expired") === "true";

  // Role visual aesthetics configurations
  const getGlowStyle = () => {
    switch (targetRole) {
      case "admin": return { boxShadow: "0 0 25px rgba(16, 185, 129, 0.25)", borderTop: "4px solid var(--accent-green)" };
      case "donor": return { boxShadow: "0 0 25px rgba(225, 29, 72, 0.25)", borderTop: "4px solid var(--accent-red)" };
      case "hospital": return { boxShadow: "0 0 25px rgba(59, 130, 246, 0.25)", borderTop: "4px solid #3b82f6" };
      case "recipient": return { boxShadow: "0 0 25px rgba(139, 92, 246, 0.25)", borderTop: "4px solid #8b5cf6" };
      case "volunteer": return { boxShadow: "0 0 25px rgba(245, 158, 11, 0.25)", borderTop: "4px solid var(--accent-orange)" };
      default: return { boxShadow: "var(--shadow-glass)" };
    }
  };

  const getRoleDisplayName = () => {
    if (!targetRole) return "Portal Access";
    return `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} Authentication`;
  };

  return (
    <div style={styles.container}>
      <div className="glass-card fade-in" style={{ ...styles.card, ...getGlowStyle() }}>
        <div style={styles.header}>
          <span style={styles.logoIcon}>🩸</span>
          <h2 style={styles.logoText}>{getRoleDisplayName()}</h2>
          <p style={styles.subtitle}>LifeLink Blood Bank Management System</p>
        </div>

        {isSessionExpired && mode === "login" && (
          <div className="alert alert-danger" style={{ fontSize: "0.85rem", padding: "0.75rem" }}>
            <AlertTriangle size={16} />
            <span>Your session has expired. Please log in again.</span>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ fontSize: "0.85rem", padding: "0.75rem" }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ fontSize: "0.85rem", padding: "0.75rem" }}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* LOGIN MODE */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit(onLogin)}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="form-control"
                  style={styles.formInput}
                  {...registerLogin("email")}
                />
              </div>
              {loginErrors.email && <div className="form-error">{loginErrors.email.message}</div>}
            </div>

            <div className="form-group">
              <div style={styles.labelForgotRow}>
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  style={styles.forgotBtn}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-control"
                  style={styles.formInput}
                  {...registerLogin("password")}
                />
              </div>
              {loginErrors.password && <div className="form-error">{loginErrors.password.message}</div>}
            </div>

            <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={submitting}>
              {submitting ? "Signing In..." : "Sign In"}
            </button>

            <div style={styles.footerLink}>
              New to LifeLink? <Link to="/register" style={styles.linkText}>Create an Account</Link>
            </div>
            <div style={styles.footerLink}>
              <Link to="/" style={styles.linkText}>&larr; Back to Landing Page</Link>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD MODE */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotSubmit(onForgot)}>
            <h3 style={styles.modeTitle}>Reset Password</h3>
            <p style={styles.modeDesc}>Enter your registered email address and we'll send you a 6-digit OTP verification code.</p>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="form-control"
                  style={styles.formInput}
                  {...registerForgot("email")}
                />
              </div>
              {forgotErrors.email && <div className="form-error">{forgotErrors.email.message}</div>}
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? "Sending OTP..." : "Get OTP"}
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD MODE */}
        {mode === "reset" && (
          <form onSubmit={handleResetSubmit(onReset)}>
            <h3 style={styles.modeTitle}>Verify Reset Code</h3>
            <p style={styles.modeDesc}>Please enter the 6-digit verification code sent to your email along with your new password.</p>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="form-control"
                  style={styles.formInput}
                  {...registerReset("email")}
                />
              </div>
              {resetErrors.email && <div className="form-error">{resetErrors.email.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">6-Digit OTP</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="form-control"
                  style={styles.formInput}
                  {...registerReset("otp")}
                />
              </div>
              {resetErrors.otp && <div className="form-error">{resetErrors.otp.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-control"
                  style={styles.formInput}
                  {...registerReset("new_password")}
                />
              </div>
              {resetErrors.new_password && <div className="form-error">{resetErrors.new_password.message}</div>}
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? "Resetting..." : "Save Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "var(--bg-primary)",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    padding: "2.5rem",
    transition: "box-shadow 0.3s ease, border-top 0.3s ease",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  logoIcon: {
    fontSize: "2.5rem",
  },
  logoText: {
    fontFamily: "var(--font-title)",
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    marginTop: "0.25rem",
    letterSpacing: "-0.03em",
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "var(--text-muted)",
    marginTop: "0.25rem",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "1rem",
    color: "var(--text-muted)",
  },
  formInput: {
    paddingLeft: "2.75rem",
  },
  labelForgotRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    color: "var(--accent-red)",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtn: {
    width: "100%",
    marginTop: "1.5rem",
  },
  footerLink: {
    textAlign: "center",
    marginTop: "1.5rem",
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  linkText: {
    color: "var(--accent-red)",
    fontWeight: 600,
    ":hover": {
      textDecoration: "underline",
    },
  },
  modeTitle: {
    fontSize: "1.25rem",
    marginBottom: "0.5rem",
  },
  modeDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginBottom: "1.5rem",
    lineHeight: 1.4,
  },
  actionRow: {
    display: "flex",
    gap: "1rem",
    marginTop: "1.5rem",
  },
};

export default Login;
