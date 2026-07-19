import React from "react";
import "../styles/Summary.css";

const SummarySection = ({ summary }) => {
  const s = summary || {
    dholPresent: 0,
    dholAbsent: 0,
    tashaPresent: 0,
    tashaAbsent: 0,
    totalPresent: 0,
    totalAbsent: 0,
  };

  return (
    <div className="summary-section">
      <div className="summary-card">
        <span className="summary-label">Dhol — Present</span>
        <span className="summary-value present">{s.dholPresent}</span>
        <span className="summary-divider">/</span>
        <span className="summary-label">Absent</span>
        <span className="summary-value absent">{s.dholAbsent}</span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Tasha — Present</span>
        <span className="summary-value present">{s.tashaPresent}</span>
        <span className="summary-divider">/</span>
        <span className="summary-label">Absent</span>
        <span className="summary-value absent">{s.tashaAbsent}</span>
      </div>
      <div className="summary-card summary-card-total summary-card-total-stacked">
        <div className="summary-total-row">
          <span className="summary-label">Total Present</span>
          <span className="summary-value present">{s.totalPresent}</span>
        </div>
        <span className="summary-divider total-desktop-divider">/</span>
        <div className="summary-total-row">
          <span className="summary-label">Total Absent</span>
          <span className="summary-value absent">{s.totalAbsent}</span>
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
