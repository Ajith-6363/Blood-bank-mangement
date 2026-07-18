import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Phone, MapPin, KeyRound, CheckCircle, AlertTriangle } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Enter valid address details"),
  blood_group: z.string().optional().nullable(),
  password: z.string().optional().or(z.literal("")),
  old_password: z.string().min(6, "Current password is required to save changes"),
}).refine((data) => {
  if (data.password && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "New password must be at least 6 characters",
  path: ["password"]
});

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      blood_group: user?.blood_group || "",
      password: "",
      old_password: "",
    }
  });

  const onSubmit = async (data) => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password; // Don't send empty password
      await updateUserProfile(payload);
      setSuccess("Profile details updated successfully.");
      setValue("password", ""); // Clear password input
      setValue("old_password", ""); // Clear old password input
    } catch (err) {
      setError(err.response?.data?.detail || "Update failed. Please check inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2>My Account Settings</h2>
        <p className="subtitle">Update your profile parameters and password credentials</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="glass-card">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Full Name / Org Name</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input type="text" className="form-control" style={styles.formInput} {...register("full_name")} />
              </div>
              {errors.full_name && <div className="form-error">{errors.full_name.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input type="email" className="form-control" style={styles.formInput} {...register("email")} />
              </div>
              {errors.email && <div className="form-error">{errors.email.message}</div>}
            </div>
          </div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Phone Number</label>
              <div style={styles.inputWrapper}>
                <Phone size={18} style={styles.inputIcon} />
                <input type="text" className="form-control" style={styles.formInput} {...register("phone")} />
              </div>
              {errors.phone && <div className="form-error">{errors.phone.message}</div>}
            </div>

            {user?.role !== "hospital" && user?.role !== "admin" && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Blood Group (Read-only)</label>
                <input type="text" className="form-control" style={{ backgroundColor: "var(--bg-tertiary)" }} value={user?.blood_group || "N/A"} disabled />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Delivery Address / Physical Details</label>
            <div style={styles.inputWrapper}>
              <MapPin size={18} style={styles.inputIcon} />
              <textarea className="form-control" rows={3} style={{ ...styles.formInput, resize: "none" }} {...register("address")} />
            </div>
            {errors.address && <div className="form-error">{errors.address.message}</div>}
          </div>

          <div style={{ margin: "2rem 0", borderTop: "1px solid var(--border-color)" }}></div>

          <div style={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Change Password (Leave blank to keep current)</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input type="password" placeholder="New password" className="form-control" style={styles.formInput} {...register("password")} />
              </div>
              {errors.password && <div className="form-error">{errors.password.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Current Password (Required to authorize edits)</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input type="password" placeholder="Current password" className="form-control" style={styles.formInput} {...register("old_password")} />
              </div>
              {errors.old_password && <div className="form-error">{errors.old_password.message}</div>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "1.5rem" }} disabled={submitting}>
            {submitting ? "Saving Changes..." : "Save Account Settings"}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  row: {
    display: "flex",
    gap: "1.5rem",
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
};

export default Profile;
