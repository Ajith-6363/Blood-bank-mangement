import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "../services/api";
import Modal from "../components/Modal";
import { Droplet, FileDown, PlusCircle, AlertTriangle, ShieldCheck, CheckCircle } from "lucide-react";

const batchSchema = z.object({
  blood_group: z.string().min(1, "Select blood group"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1 unit"),
  collection_date: z.string().min(1, "Select collection date"),
  expiry_date: z.string().min(1, "Select expiry date"),
  storage_location: z.string().min(2, "Enter storage refrigerator location"),
  status: z.string().default("available"),
});

const BloodStock = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [stockSummary, setStockSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterGroup, setFilterGroup] = useState("");
  const [filterStatus, setFilterStatus] = useState("available");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(batchSchema),
    defaultValues: { status: "available" }
  });

  useEffect(() => {
    fetchStockData();
  }, [filterGroup, filterStatus]);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterGroup) params.blood_group = filterGroup;
      if (filterStatus) params.status = filterStatus;

      const [batchesRes, summaryRes] = await Promise.all([
        api.get("/stock/batches", { params }),
        api.get("/stock")
      ]);

      setBatches(batchesRes.data);
      setStockSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch inventory data.");
    } finally {
      setLoading(false);
    }
  };

  const onAddBatch = async (data) => {
    setError("");
    setSuccess("");
    try {
      await api.post("/stock", data);
      setSuccess("New blood stock batch registered successfully.");
      setIsAddOpen(false);
      reset();
      fetchStockData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add batch.");
    }
  };

  const onToggleStatus = async (batchNum, currentStatus) => {
    setError("");
    setSuccess("");
    const nextStatus = currentStatus === "available" ? "reserved" : "available";
    try {
      await api.put(`/stock/${batchNum}`, { status: nextStatus });
      setSuccess(`Batch ${batchNum} status updated to ${nextStatus}.`);
      fetchStockData();
    } catch (err) {
      setError(err.response?.data?.detail || "Status update failed.");
    }
  };

  const handleCollectionDateChange = (e) => {
    const colDateVal = e.target.value;
    if (colDateVal) {
      // Auto-calculate expiry date to 42 days in the future
      const colDateObj = new Date(colDateVal);
      colDateObj.setDate(colDateObj.getDate() + 42);
      const expDateString = colDateObj.toISOString().split("T")[0];
      setValue("expiry_date", expDateString);
    }
  };

  const exportToCSV = () => {
    if (batches.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Define CSV Headers
    const headers = ["Batch Number", "Blood Group", "Quantity", "Collection Date", "Expiry Date", "Storage Location", "Status"];
    
    // Format rows
    const rows = batches.map((b) => [
      b.batch_number,
      b.blood_group,
      b.quantity,
      b.collection_date,
      b.expiry_date,
      b.storage_location || "N/A",
      b.status,
    ]);

    // Construct CSV String
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LifeLink_Stock_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Blood Refrigerator Inventory</h2>
          <p className="subtitle">Real-time batch-level blood bank cold storage logs</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={exportToCSV}
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            title="Download CSV report"
          >
            <FileDown size={18} /> Export CSV
          </button>
          {user.role === "admin" && (
            <button
              onClick={() => {
                setIsAddOpen(true);
                // Set default dates
                const todayStr = new Date().toISOString().split("T")[0];
                setTimeout(() => {
                  setValue("collection_date", todayStr);
                  handleCollectionDateChange({ target: { value: todayStr } });
                }, 100);
              }}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <PlusCircle size={18} /> Add Batch
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stock warning metrics */}
      {stockSummary && (
        <div className="glass-card" style={styles.summaryContainer}>
          <h3 style={styles.cardTitle}>Live Blood Units Level Overview</h3>
          <div style={styles.summaryGrid}>
            {stockSummary.group_summaries.map((grp) => (
              <div key={grp.blood_group} style={{ ...styles.summaryCard, borderTopColor: grp.available_bags < 5 ? "var(--accent-red)" : "var(--border-color)" }}>
                <span style={styles.groupLabel}>{grp.blood_group}</span>
                <span style={{ ...styles.groupValue, color: grp.available_bags < 5 ? "var(--accent-red)" : "var(--text-primary)" }}>
                  {grp.available_bags} <span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "var(--text-secondary)" }}>bags</span>
                </span>
                {grp.available_bags < 5 ? (
                  <div style={styles.warnText}><AlertTriangle size={12} /> Low Stock!</div>
                ) : (
                  <div style={styles.okText}><ShieldCheck size={12} /> Stable</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtering Row */}
      <div className="glass-card" style={styles.filterRow}>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label className="form-label" style={{ fontSize: "0.75rem" }}>Filter Blood Group</label>
          <select className="form-control" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
            <option value="">All Groups</option>
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

        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label className="form-label" style={{ fontSize: "0.75rem" }}>Filter Status</label>
          <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="available">Available (In Fridge)</option>
            <option value="reserved">Reserved (Allocated)</option>
            <option value="expired">Expired (Discarded)</option>
            <option value="transfused">Transfused (Injected)</option>
          </select>
        </div>
      </div>

      {/* Batches Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Blood Type</th>
                <th>Quantity</th>
                <th>Collection Date</th>
                <th>Expiry Date</th>
                <th>Storage Location</th>
                <th>Status</th>
                {user.role === "admin" && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>
                    <div className="skeleton skeleton-text" style={{ width: "80%", margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No matching blood batches found in refrigerator.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.batch_number}>
                    <td><strong>{b.batch_number}</strong></td>
                    <td>
                      <span className="badge badge-red">{b.blood_group}</span>
                    </td>
                    <td>{b.quantity} bag(s)</td>
                    <td>{new Date(b.collection_date).toLocaleDateString()}</td>
                    <td>
                      <span style={{ color: b.status === "expired" ? "var(--accent-red)" : "inherit" }}>
                        {new Date(b.expiry_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td>{b.storage_location || "Fridge Cold Block"}</td>
                    <td>
                      <span
                        className={`badge ${
                          b.status === "available"
                            ? "badge-green"
                            : b.status === "expired"
                            ? "badge-red"
                            : b.status === "reserved"
                            ? "badge-orange"
                            : "badge-muted"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    {user.role === "admin" && (
                      <td>
                        {b.status !== "expired" && b.status !== "transfused" && (
                          <button
                            onClick={() => onToggleStatus(b.batch_number, b.status)}
                            className="btn btn-secondary btn-sm"
                          >
                            {b.status === "available" ? "Reserve" : "Release"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Add Batch Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Manually Add Blood Batch">
        <form onSubmit={handleSubmit(onAddBatch)}>
          <div className="form-group">
            <label className="form-label">Blood Group</label>
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

          <div className="form-group">
            <label className="form-label">Quantity (Units/Bags)</label>
            <input type="number" className="form-control" {...register("quantity")} />
            {errors.quantity && <div className="form-error">{errors.quantity.message}</div>}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Collection Date</label>
              <input type="date" className="form-control" {...register("collection_date")} onChange={handleCollectionDateChange} />
              {errors.collection_date && <div className="form-error">{errors.collection_date.message}</div>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Expiry Date (Auto: +42 days)</label>
              <input type="date" className="form-control" {...register("expiry_date")} />
              {errors.expiry_date && <div className="form-error">{errors.expiry_date.message}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Storage Location</label>
            <input type="text" placeholder="e.g. Fridge A, Shelf 2" className="form-control" {...register("storage_location")} />
            {errors.storage_location && <div className="form-error">{errors.storage_location.message}</div>}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
            Add Stock Batch
          </button>
        </form>
      </Modal>
    </div>
  );
};

const styles = {
  summaryContainer: {
    marginBottom: "2rem",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "var(--text-secondary)",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: "1rem",
  },
  summaryCard: {
    background: "var(--bg-tertiary)",
    borderTop: "3px solid var(--border-color)",
    borderRadius: "8px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "var(--shadow-sm)",
  },
  groupLabel: {
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  groupValue: {
    fontSize: "1.5rem",
    fontWeight: 800,
    fontFamily: "var(--font-title)",
    margin: "0.25rem 0",
  },
  warnText: {
    fontSize: "0.7rem",
    color: "var(--accent-red)",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  okText: {
    fontSize: "0.7rem",
    color: "var(--accent-green)",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  filterRow: {
    display: "flex",
    gap: "1rem",
    padding: "1rem",
    marginBottom: "1.5rem",
  },
};

export default BloodStock;
