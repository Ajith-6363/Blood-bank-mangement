import React, { useState, useEffect } from "react";
import api from "../services/api";
import { UserCheck, ShieldAlert, Trash2, Search, CheckCircle } from "lucide-react";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterRole) params.role = filterRole;
      const response = await api.get("/users", { params });
      setUsers(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch users list.");
    } finally {
      setLoading(false);
    }
  };

  const onToggleActive = async (id, name) => {
    setError("");
    setSuccess("");
    try {
      await api.put(`/users/${id}/toggle-active`);
      setSuccess(`Updated status for user: ${name}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Action failed.");
    }
  };

  const onVerifyUser = async (id, name) => {
    setError("");
    setSuccess("");
    try {
      await api.put(`/users/${id}/verify`);
      setSuccess(`Verified credentials for: ${name}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Verification failed.");
    }
  };

  const onDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the account for ${name}?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await api.delete(`/users/${id}`);
      setSuccess(`Permanently deleted user: ${name}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Deletion failed.");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Manage Users</h2>
          <p className="subtitle">Suspend, delete, and verify donor and hospital accounts</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters and search */}
      <div className="glass-card" style={styles.filterRow}>
        <div style={{ ...styles.searchWrapper, flex: 2 }}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="form-control"
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <select className="form-control" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="donor">Donors</option>
            <option value="recipient">Recipients</option>
            <option value="hospital">Hospitals</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Blood Type</th>
                <th>Account Status</th>
                <th>Verification</th>
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.full_name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {u.email} | Phone: {u.phone || "N/A"}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-muted">{u.role}</span>
                    </td>
                    <td>
                      {u.blood_group ? (
                        <span className="badge badge-red">{u.blood_group}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_verified ? "badge-green" : "badge-orange"}`}>
                        {u.is_verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {u.role !== "admin" && (
                          <>
                            {!u.is_verified && (
                              <button
                                onClick={() => onVerifyUser(u.id, u.full_name)}
                                className="btn btn-secondary btn-sm"
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                                title="Approve credentials"
                              >
                                <UserCheck size={14} /> Approve
                              </button>
                            )}
                            <button
                              onClick={() => onToggleActive(u.id, u.full_name)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                              title={u.is_active ? "Suspend account" : "Activate account"}
                            >
                              <ShieldAlert size={14} /> {u.is_active ? "Suspend" : "Activate"}
                            </button>
                            <button
                              onClick={() => onDeleteUser(u.id, u.full_name)}
                              className="btn btn-danger btn-sm"
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                              title="Permanently delete account"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </>
                        )}
                        {u.role === "admin" && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Admin account</span>
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
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "1rem",
    color: "var(--text-muted)",
  },
  searchInput: {
    paddingLeft: "2.75rem",
  },
};

export default UsersManagement;
