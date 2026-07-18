import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "../services/api";
import Modal from "../components/Modal";
import { Calendar, User, Activity, AlertTriangle, FileText, CheckCircle, Award } from "lucide-react";

const apptSchema = z.object({
  blood_group: z.string().min(1, "Select blood group"),
  appointment_date: z.string().min(1, "Select date and time"),
  quantity: z.coerce.number().int().min(1, "Must be at least 1 unit").max(2, "Maximum 2 units"),
});

const checkInSchema = z.object({
  hemoglobin_level: z.coerce.number().min(12.5, "Hemoglobin must be at least 12.5 g/dL to donate"),
  weight: z.coerce.number().min(50, "Weight must be at least 50 kg to donate"),
  temperature: z.coerce.number().min(36).max(38, "Temperature must be within normal range"),
  pulse_rate: z.coerce.number().int().min(60).max(100, "Pulse must be between 60 and 100 bpm"),
  blood_pressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "Must be formatted as Systolic/Diastolic (e.g. 120/80)"),
  doctor_name: z.string().min(2, "Enter attending doctor's name"),
  medical_notes: z.string().optional(),
  remarks: z.string().optional(),
});

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState({ eligible: true, reason: "" });
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register: registerAppt, handleSubmit: handleApptSubmit, formState: { errors: apptErrors }, reset: resetAppt } = useForm({
    resolver: zodResolver(apptSchema)
  });

  const { register: registerCheckIn, handleSubmit: handleCheckInSubmit, formState: { errors: checkInErrors }, reset: resetCheckIn } = useForm({
    resolver: zodResolver(checkInSchema)
  });

  useEffect(() => {
    fetchAppointments();
    if (user.role === "donor") {
      fetchEligibility();
    }
  }, [user]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const endpoint = (user.role === "admin" || user.role === "volunteer") ? "/donations/all" : "/donations/my";
      const response = await api.get(endpoint);
      setAppointments(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch appointments.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibility = async () => {
    try {
      const response = await api.get("/donations/eligibility-check");
      setEligibility(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const onSchedule = async (data) => {
    setError("");
    setSuccess("");
    try {
      await api.post("/donations/schedule", data);
      setSuccess("Appointment booked successfully.");
      setIsScheduleOpen(false);
      resetAppt();
      fetchAppointments();
      fetchEligibility();
    } catch (err) {
      setError(err.response?.data?.detail || "Booking failed.");
    }
  };

  const onUpdateStatus = async (id, status) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/donations/${id}/status`, { status });
      setSuccess(`Appointment status updated to ${status}.`);
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.detail || "Update failed.");
    }
  };

  const openCheckInModal = (appt) => {
    setSelectedAppt(appt);
    setIsCheckInOpen(true);
    resetCheckIn({
      weight: 65,
      hemoglobin_level: 14.2,
      temperature: 37.0,
      pulse_rate: 72,
      blood_pressure: "120/80",
      doctor_name: "Dr. Sarah Miller",
      medical_notes: "",
      remarks: "Donor looks healthy"
    });
  };

  const onCheckInSubmit = async (data) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/donations/${selectedAppt.id}/status`, {
        status: "completed",
        ...data
      });
      setSuccess("Donation checked-in and stock batch generated successfully.");
      setIsCheckInOpen(false);
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.detail || "Check-in failed.");
    }
  };

  const downloadCertificate = async (id) => {
    try {
      const response = await api.get(`/donations/${id}/certificate`);
      const cert = response.data;
      
      // Simple HTML printable layout
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>LifeLink Certificate</title>
            <style>
              body { font-family: 'Outfit', sans-serif; text-align: center; padding: 40px; background-color: #f8fafc; color: #0f172a; }
              .cert-box { border: 10px double #be123c; padding: 40px; border-radius: 20px; background: white; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .logo { font-size: 40px; color: #be123c; margin-bottom: 20px; }
              h1 { font-family: 'Outfit', sans-serif; font-size: 32px; color: #1e293b; margin-top: 0; }
              h2 { font-size: 20px; font-weight: 500; color: #475569; margin-bottom: 30px; }
              .donor-name { font-size: 28px; font-weight: bold; color: #be123c; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 5px; margin: 20px 0; }
              .details { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 40px; }
              .footer { display: flex; justify-content: space-between; margin-top: 50px; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="cert-box">
              <div class="logo">🩸</div>
              <h1>Certificate of Donation</h1>
              <h2>THIS CERTIFICATE IS PROUDLY PRESENTED TO</h2>
              <div class="donor-name">${cert.donor_name}</div>
              <div class="details">
                For voluntarily donating <strong>${cert.quantity_units} bag(s)</strong> of whole blood of group <strong>${cert.blood_group}</strong><br/>
                on <strong>${cert.donation_date}</strong> at <strong>${cert.hospital}</strong>.<br/>
                Your noble gesture helps save lives and inspires our community.
              </div>
              <div class="footer">
                <div>
                  <strong>Certificate ID:</strong><br/>${cert.certificate_id}
                </div>
                <div>
                  <strong>Attending Doctor:</strong><br/>${cert.doctor_name}
                </div>
              </div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      alert("Failed to download certificate.");
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Donation Appointments</h2>
          <p className="subtitle">Schedule and audit donor visits</p>
        </div>
        {user.role === "donor" && (
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="btn btn-primary"
            disabled={!eligibility.eligible}
          >
            Book Appointment
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* List Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                {(user.role === "admin" || user.role === "volunteer") && <th>Donor Profile</th>}
                <th>Date & Time</th>
                <th>Blood Group</th>
                <th>Units</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                    <div className="skeleton skeleton-text" style={{ width: "80%", margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No appointments scheduled.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id}>
                    {(user.role === "admin" || user.role === "volunteer") && (
                      <td>
                        <strong>{appt.donor?.full_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{appt.donor?.email}</div>
                      </td>
                    )}
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
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {appt.status === "completed" && appt.certificate_generated && (
                          <button
                            onClick={() => downloadCertificate(appt.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            <Award size={14} /> Certificate
                          </button>
                        )}
                        {(user.role === "admin" || user.role === "volunteer") && appt.status === "scheduled" && (
                          <>
                            <button
                              onClick={() => onUpdateStatus(appt.id, "approved")}
                              className="btn btn-secondary btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onUpdateStatus(appt.id, "cancelled")}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(user.role === "admin" || user.role === "volunteer") && appt.status === "approved" && (
                          <button
                            onClick={() => openCheckInModal(appt)}
                            className="btn btn-primary btn-sm"
                          >
                            Verify & Check-in
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Donor scheduling modal */}
      <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title="Book Appointment">
        <form onSubmit={handleApptSubmit(onSchedule)}>
          <div className="form-group">
            <label className="form-label">Blood Group</label>
            <select className="form-control" {...registerAppt("blood_group")}>
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
            {apptErrors.blood_group && <div className="form-error">{apptErrors.blood_group.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Quantity (Units/Bags)</label>
            <input type="number" className="form-control" defaultValue={1} {...registerAppt("quantity")} />
            {apptErrors.quantity && <div className="form-error">{apptErrors.quantity.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Appointment Date & Time</label>
            <input type="datetime-local" className="form-control" {...registerAppt("appointment_date")} />
            {apptErrors.appointment_date && <div className="form-error">{apptErrors.appointment_date.message}</div>}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
            Submit Booking
          </button>
        </form>
      </Modal>

      {/* Admin check-in verification modal */}
      <Modal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} title="Verify Donor Health Stats">
        {selectedAppt && (
          <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Checking in: <strong>{selectedAppt.donor?.full_name}</strong> for {selectedAppt.blood_group} donation.
          </div>
        )}
        <form onSubmit={handleCheckInSubmit(onCheckInSubmit)}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Weight (kg)</label>
              <input type="number" step="0.1" className="form-control" {...registerCheckIn("weight")} />
              {checkInErrors.weight && <div className="form-error">{checkInErrors.weight.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Hemoglobin (g/dL)</label>
              <input type="number" step="0.1" className="form-control" {...registerCheckIn("hemoglobin_level")} />
              {checkInErrors.hemoglobin_level && <div className="form-error">{checkInErrors.hemoglobin_level.message}</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Temp (°C)</label>
              <input type="number" step="0.1" className="form-control" {...registerCheckIn("temperature")} />
              {checkInErrors.temperature && <div className="form-error">{checkInErrors.temperature.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Pulse (bpm)</label>
              <input type="number" className="form-control" {...registerCheckIn("pulse_rate")} />
              {checkInErrors.pulse_rate && <div className="form-error">{checkInErrors.pulse_rate.message}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Blood Pressure (Systolic/Diastolic)</label>
            <input type="text" placeholder="120/80" className="form-control" {...registerCheckIn("blood_pressure")} />
            {checkInErrors.blood_pressure && <div className="form-error">{checkInErrors.blood_pressure.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Attending Doctor Name</label>
            <input type="text" className="form-control" {...registerCheckIn("doctor_name")} />
            {checkInErrors.doctor_name && <div className="form-error">{checkInErrors.doctor_name.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Medical Notes / Warnings</label>
            <textarea className="form-control" rows={2} style={{ resize: "none" }} {...registerCheckIn("medical_notes")} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
            Verify & Generate Stock Batch
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Appointments;
