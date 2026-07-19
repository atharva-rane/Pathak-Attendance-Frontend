import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Navbar title="Pathak Attendance" />

      <main className="home-main">
        <h2 className="home-heading">Make Attendance</h2>
        <p className="home-sub">Open the attendance sheet to view and mark today's Dhol and Tasha students.</p>

        <div className="home-grid">
          <div className="group-card group-card-wide">
            <div className="group-card-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <ellipse cx="20" cy="9" rx="13" ry="5" fill="white" fillOpacity="0.9" />
                <rect x="7" y="9" width="26" height="21" rx="3" fill="white" fillOpacity="0.55" />
                <ellipse cx="20" cy="31" rx="13" ry="5" fill="white" fillOpacity="0.35" />
              </svg>
            </div>
            <div className="group-card-label">Dhol &amp; Tasha</div>
            <div className="group-card-tagline">Both groups, one attendance sheet</div>

            <button
              className="group-card-cta-btn"
              onClick={() => navigate("/attendance")}
            >
              Mark Attendance →
            </button>

            <button
              className="group-card-link"
              onClick={() => navigate("/attendance/overall")}
            >
              📊 View Overall Attendance
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
