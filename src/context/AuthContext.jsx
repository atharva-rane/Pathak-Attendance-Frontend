import React, { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem("pathak_admin");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("pathak_token", data.token);
    localStorage.setItem("pathak_admin", JSON.stringify({ username: data.username }));
    setAdmin({ username: data.username });
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout — clear local session regardless
    }
    localStorage.removeItem("pathak_token");
    localStorage.removeItem("pathak_admin");
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
