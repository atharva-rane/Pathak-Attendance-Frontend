import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = ({ title, onBack }) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onBack && (
          <button className="navbar-back" onClick={onBack} aria-label="Go back">
            ←
          </button>
        )}
        <span className="navbar-title">{title}</span>
      </div>
      <div className="navbar-right">
        <span className="navbar-admin">{admin?.username}</span>
        <button className="navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
