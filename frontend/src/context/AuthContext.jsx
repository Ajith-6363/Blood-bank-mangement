import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const response = await api.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          console.error("Session restoration failed:", error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    // FastAPI OAuth2PasswordRequestForm expects x-www-form-urlencoded format
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const response = await api.post("/auth/login", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, refresh_token, role, full_name, email: userEmail, user_id } = response.data;

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("user_role", role);
    localStorage.setItem("user_name", full_name);
    localStorage.setItem("user_id", user_id);
    localStorage.setItem("user_email", userEmail);

    // Fetch user details
    const userProfileResponse = await api.get("/auth/me");
    setUser(userProfileResponse.data);
    return userProfileResponse.data;
  };

  const register = async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    setUser(null);
  };

  const updateUserProfile = async (updatedData) => {
    const response = await api.put("/auth/me", updatedData);
    setUser(response.data);
    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
