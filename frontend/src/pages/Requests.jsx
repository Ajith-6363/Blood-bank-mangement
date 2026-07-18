import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "../services/api";
import Modal from "../components/Modal";
import { FileText, CheckCircle, Clock, AlertTriangle, Eye, ShieldAlert, Award } from "lucide-react";

const requestSchema = z.object({
  blood_group: z.string().min(1, "Select blood group"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1 unit"),
  patient_name: z.string().min(2, "Enter patient name"),
  patient_age: z.coerce.number().int().min(0).max(120),
  doctor_name: z.string().min(2, "Enter attending doctor name"),
  hospital_name: z.string().min(2, "Enter hospital name"),
  hospital_address: z.string().min(5, "Enter hospital delivery address"),
  contact_person: z.string().min(2, "Enter emergency contact name"),
  urgency: z.enum(["normal", "urgent", "critical"]),
  expected_delivery: z.string().min(1, "Select expected delivery date"),
  reason: z.string().optional(),
});

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMatchingOpen, setIsMatchingOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [compatibleBatches, setCompatibleBatches] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(requestSchema)
  });

  useEffect(() => {
    fetchRequests();
  }, [user, filterStatus, filterGroup]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      if (user.role === "admin") {
        let params = {};
        if (filterStatus) params.status = filterStatus;
        if (filterGroup) params.blood_group = filterGroup;
        const response = await api.get("/requests/all", { params });
        setRequests(response.data);
      } else {
        const response = await api.get("/requests/my");
        setRequests(response.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch blood requests.");
    } finally {
      setLoading(false);
    }
  };

  const onCreateRequest = async (data) => {
    setError("");
    setSuccess("");
    try {
      await api.post("/requests/create", data);
      setSuccess("Blood request ticket registered successfully.");
      setIsCreateOpen(false);
      reset();
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.detail || "Request failed.");
    }
  };

  const onUpdateStatus = async (id, status) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/requests/${id}/status`, { status });
      setSuccess(`Request status updated to ${status}.`);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.detail || "Update failed.");
    }
  };

  const checkCompatibility = async (req) => {
    setSelectedRequest(req);
    setIsMatchingOpen(true);
    setMatchingLoading(true);
    try {
      const response = await api.get(`/stock/compatible/${req.blood_group}`);
      setCompatibleBatches(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to check compatible stock.");
    } finally {
      setMatchingLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Blood Request Tickets</h2>
          <p className="subtitle">Manage and fulfill patient blood requirements</p>
        </div>
        {user.role !== "admin" && (
          <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary" disabled={user.role === "hospital" && !user.is_verified}>
            Request Blood
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters for admin */}
      {user.role === "admin" && (
        <div className="glass-card" style={styles.filterRow}>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="fulfilled">Fulfilled</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <select className="form-control" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
              <option value="">All Blood Groups</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>
      )}

      {/* Requests table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Blood Type</th>
                <th>Units Needed</th>
                <th>Urgency</th>
                <th>Expected Delivery</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    <div className="skeleton skeleton-text" style={{ width: "80%", margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No request tickets registered.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <strong>{req.patient_name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Age: {req.patient_age} | {req.hospital_name}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-red">{req.blood_group}</span>
                    </td>
                    <td>{req.quantity} unit(s)</td>
                    <td>
                      <span
                        className={`badge ${
                          req.urgency === "critical"
                            ? "badge-red"
                            : req.urgency === "urgent"
                            ? "badge-orange"
                            : "badge-muted"
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </td>
                    <td>{new Date(req.expected_delivery).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge ${
                          req.status === "fulfilled"
                            ? "badge-green"
                            : req.status === "pending"
                            ? "badge-orange"
                            : req.status === "approved"
                            ? "badge-green"
                            : "badge-red"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {user.role === "admin" && (
                          <>
                            <button
                              onClick={() => checkCompatibility(req)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                              title="Match Compatibility"
                            >
                              <Eye size={14} /> Match Stock
                            </button>
                            {req.status === "pending" && (
                              <>
                                <button
                                  onClick={() => onUpdateStatus(req.id, "approved")}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => onUpdateStatus(req.id, "rejected")}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status === "approved" && (
                              <button
                                onClick={() => onUpdateStatus(req.id, "fulfilled")}
                                className="btn btn-primary btn-sm"
                              >
                                Fulfill Request
                              </button>
                            )}
                          </>
                        )}
                        {user.role !== "admin" && req.status === "pending" && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Pending review</span>
                        )}
                        {user.role !== "admin" && req.status === "fulfilled" && (
                          <span style={{ color: "var(--accent-green)", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <CheckCircle size={14} /> Dispatched
                          </span>
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

      {/* Creation Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register Blood Request Ticket">
        <form onSubmit={handleSubmit(onCreateRequest)}>
          <div style={styles.modalRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Blood Group Needed</label>
              <select className="form-control" {...register("blood_group")}>
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

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Quantity (Bags/Units)</label>
              <input type="number" className="form-control" {...register("quantity")} />
              {errors.quantity && <div className="form-error">{errors.quantity.message}</div>}
            </div>
          </div>

          <div style={styles.modalRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Patient Full Name</label>
              <input type="text" className="form-control" {...register("patient_name")} />
              {errors.patient_name && <div className="form-error">{errors.patient_name.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Patient Age</label>
              <input type="number" className="form-control" {...register("patient_age")} />
              {errors.patient_age && <div className="form-error">{errors.patient_age.message}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Attending Doctor Name</label>
            <input type="text" className="form-control" {...register("doctor_name")} />
            {errors.doctor_name && <div className="form-error">{errors.doctor_name.message}</div>}
          </div>

          <div style={styles.modalRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Hospital / Center Name</label>
              <input type="text" className="form-control" {...register("hospital_name")} />
              {errors.hospital_name && <div className="form-error">{errors.hospital_name.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Contact Person Name</label>
              <input type="text" className="form-control" {...register("contact_person")} />
              {errors.contact_person && <div className="form-error">{errors.contact_person.message}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Hospital Delivery Address</label>
            <textarea className="form-control" rows={2} style={{ resize: "none" }} {...register("hospital_address")} />
            {errors.hospital_address && <div className="form-error">{errors.hospital_address.message}</div>}
          </div>

          <div style={styles.modalRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Urgency Priority</label>
              <select className="form-control" {...register("urgency")}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical / Emergency</option>
              </select>
              {errors.urgency && <div className="form-error">{errors.urgency.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Target Delivery Date</label>
              <input type="date" className="form-control" {...register("expected_delivery")} />
              {errors.expected_delivery && <div className="form-error">{errors.expected_delivery.message}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Diagnosis / Reason</label>
            <input type="text" placeholder="e.g. Major surgery" className="form-control" {...register("reason")} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
            Submit Request
          </button>
        </form>
      </Modal>

      {/* Compatibility Checker Modal */}
      <Modal isOpen={isMatchingOpen} onClose={() => setIsMatchingOpen(false)} title="Blood Stock Compatibility Match">
        {selectedRequest && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Matching for patient: <strong>{selectedRequest.patient_name}</strong>
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Requested: <strong>{selectedRequest.quantity} bags of {selectedRequest.blood_group}</strong> ({selectedRequest.urgency.toUpperCase()})
            </div>
          </div>
        )}

        {matchingLoading ? (
          <div className="skeleton skeleton-text" style={{ width: "100%", height: "80px" }}></div>
        ) : compatibleBatches.length === 0 ? (
          <div className="alert alert-danger" style={{ display: "flex", gap: "0.5rem" }}>
            <ShieldAlert size={20} />
            <span>
              <strong>Zero Stock Available:</strong> No compatible batches found in inventory for {selectedRequest?.blood_group}! Please schedule emergency donations.
            </span>
          </div>
        ) : (
          <div>
            <div className="alert alert-success" style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              <CheckCircle size={16} />
              <span>
                Found <strong>{compatibleBatches.length} compatible batches</strong> in storage. Sorted by FIFO (expiry first to avoid waste).
              </span>
            </div>

            <div className="table-container" style={{ maxHeight: "250px", overflowY: "auto" }}>
              <table className="custom-table" style={{ fontSize: "0.8rem" }}>
                <thead>
                  <tr>
                    <th>Batch Number</th>
                    <th>Group</th>
                    <th>Expiry Date</th>
                    <th>Location</th>
                    <th>Units</th>
                  </tr>
                </thead>
                <tbody>
                  {compatibleBatches.map((batch) => (
                    <tr key={batch.batch_number}>
                      <td><strong>{batch.batch_number}</strong></td>
                      <td><span className="badge badge-red">{batch.blood_group}</span></td>
                      <td>
                        {new Date(batch.expiry_date).toLocaleDateString()}
                        {new Date(batch.expiry_date) < new Date(Date.now() + 7*24*60*60*1000) && (
                          <div style={{ color: "var(--accent-red)", fontSize: "0.7rem", fontWeight: 600 }}>Expiring soon!</div>
                        )}
                      </td>
                      <td>{batch.storage_location}</td>
                      <td>{batch.quantity} Bag(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const styles = {
  filterRow: {
    display: "flex",
    gap: "1rem",
    padding: "1rem",
    marginBottom: "1.5rem",
  },
  modalRow: {
    display: "flex",
    gap: "1rem",
  },
};

export default Requests;
