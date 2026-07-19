import React from "react";
import "../styles/Modal.css";

/**
 * Blocks a Submit Attendance click when one or more students in that table
 * haven't been marked P/A/S yet.
 */
const RemainingAttendanceModal = ({ vadan, names, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
        <h3>Attendance Marking Remaining</h3>
        {names.length === 1 ? (
          <p className="modal-confirm-text">
            <strong>{names[0]}</strong>'s attendance marking is remaining. Please mark
            it before submitting {vadan} attendance.
          </p>
        ) : (
          <>
            <p className="modal-confirm-text">
              The following {vadan} students still need attendance marked before you
              can submit:
            </p>
            <ul className="modal-remaining-list">
              {names.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </>
        )}
        <div className="modal-actions">
          <button className="modal-btn-primary" onClick={onClose}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemainingAttendanceModal;
