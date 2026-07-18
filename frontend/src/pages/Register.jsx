import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, KeyRound, Phone, MapPin, CheckCircle, AlertTriangle } from "lucide-react";

// Register validation schema
const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(["donor", "recipient", "hospital"], { message: "Select a valid role" }),
  phone: z.string().min(10, { message: "Enter a valid phone number" }),
  address: z.string().min(5, { message: "Enter a valid address details" }),
  blood_group: z.string().optional().nullable(),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => {
  // If donor or recipient, blood group is required
  if ((data.role === "donor" || data.role === "recipient") && !data.blood_group) {
    return false;
  }
  return true;
}, {
  message: "Blood group is required for Donors and Recipients",
  path: ["blood_group"],
});

const Register = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "donor",
      blood_group: "",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data) => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      // For hospitals, ensure blood_group is sent as null
      const payload = {
        ...data,
        blood_group: data.role === "hospital" ? null : data.blood_group,
      };

      await registerAuth(payload);
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Registration failed. Please check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card fade-in" style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logoIcon}>🩸</span>
          <h2 style={styles.logoText}>Join LifeLink</h2>
          <p style={styles.subtitle}>Register to donate or request blood units</p>
        </div>

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

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={styles.row}>
            {/* Full Name */}
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Full Name / Org Name</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="John Doe / City Clinic"
                  className="form-control"
                  style={styles.formInput}
                  {...register("full_name")}
                />
              </div>
              {errors.full_name && <div className="form-error">{errors.full_name.message}</div>}
            </div>

            {/* Email */}
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="form-control"
                  style={styles.formInput}
                  {...register("email")}
                />
              </div>
              {errors.email && <div className="form-error">{errors.email.message}</div>}
            </div>
          </div>

          <div style={styles.row}>
            {/* Role selection */}
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">I want to register as a</label>
              <select className="form-control" {...register("role")} style={styles.select}>
                <option value="donor">Donor (Can give blood)</option>
                <option value="recipient">Recipient (Needs blood)</option>
                <option value="hospital">Hospital / Medical Center</option>
              </select>
              {errors.role && <div className="form-error">{errors.role.message}</div>}
            </div>

            {/* Blood group selection - only if donor or recipient */}
            {selectedRole !== "hospital" && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Blood Group</label>
                <select className="form-control" {...register("blood_group")} style={styles.select}>
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                {errors.blood_group && <div className="form-error">{errors.blood_group.message}</div>}
              </div>
            )}
          </div>

          <div style={styles.row}>
            {/* Phone */}
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Phone Number</label>
              <div style={styles.inputWrapper}>
                <Phone size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="+1 (555) 0123"
                  className="form-control"
                  style={styles.formInput}
                  {...register("phone")}
                />
              </div>
              {errors.phone && <div className="form-error">{errors.phone.message}</div>}
            </div>

            {/* Password */}
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Password</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-control"
                  style={styles.formInput}
                  {...register("password")}
                />
              </div>
              {errors.password && <div className="form-error">{errors.password.message}</div>}
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Address details</label>
            <div style={styles.inputWrapper}>
              <MapPin size={18} style={styles.inputIcon} />
              <textarea
                placeholder="Street address, City, ZIP code"
                rows={2}
                className="form-control"
                style={{ ...styles.formInput, resize: "none" }}
                {...register("address")}
              />
            </div>
            {errors.address && <div className="form-error">{errors.address.message}</div>}
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Account"}
          </button>

          <div style={styles.footerLink}>
            Already have an account? <Link to="/login" style={styles.linkText}>Sign In</Link>
          </div>
        </form>
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
    padding: "2rem 1rem",
  },
  card: {
    width: "100%",
    maxWidth: "680px",
    padding: "2.5rem",
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
    fontSize: "2rem",
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
  row: {
    display: "flex",
    gap: "1.25rem",
    flexWrap: "wrap",
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
  select: {
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1rem center",
    backgroundSize: "1em",
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
};

export default Register;
