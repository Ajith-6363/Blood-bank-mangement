import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";

// Components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Requests from "./pages/Requests";
import BloodStock from "./pages/BloodStock";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import UsersManagement from "./pages/UsersManagement";
import Profile from "./pages/Profile";

// Guard Route for Authenticated Users
const PrivateLayout = ({ children }) => {
  const { user, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <div className="skeleton skeleton-title" style={{ width: "200px" }}></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }

  return (
    <div className="app-container">
      <Navbar onMobileNavToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <Sidebar isMobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="main-content" style={{ marginTop: "70px" }}>
        {children}
      </main>
    </div>
  );
};

// Guard Route for Role Verification (RBAC)
const RoleGuard = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (!allowedRoles.includes(user.role)) {
    // If not allowed, send to general dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App routes container
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Private Pages */}
      <Route
        path="/dashboard"
        element={
          <PrivateLayout>
            <Dashboard />
          </PrivateLayout>
        }
      />
      <Route
        path="/appointments"
        element={
          <PrivateLayout>
            <RoleGuard allowedRoles={["admin", "donor", "volunteer"]}>
              <Appointments />
            </RoleGuard>
          </PrivateLayout>
        }
      />
      <Route
        path="/requests"
        element={
          <PrivateLayout>
            <RoleGuard allowedRoles={["admin", "recipient", "hospital"]}>
              <Requests />
            </RoleGuard>
          </PrivateLayout>
        }
      />
      <Route
        path="/stock"
        element={
          <PrivateLayout>
            <RoleGuard allowedRoles={["admin", "hospital"]}>
              <BloodStock />
            </RoleGuard>
          </PrivateLayout>
        }
      />
      <Route
        path="/notifications"
        element={
          <PrivateLayout>
            <Notifications />
          </PrivateLayout>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <PrivateLayout>
            <RoleGuard allowedRoles={["admin"]}>
              <AuditLogs />
            </RoleGuard>
          </PrivateLayout>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateLayout>
            <RoleGuard allowedRoles={["admin"]}>
              <UsersManagement />
            </RoleGuard>
          </PrivateLayout>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateLayout>
            <Profile />
          </PrivateLayout>
        }
      />

      {/* Fallback Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
