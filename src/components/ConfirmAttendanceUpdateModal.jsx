import React from "react";
import "../styles/Modal.css";

const STATUS_LABEL = {
  Present: "Present",
  Absent: "Absent",
  Seva: "Absent (Seva)",
};

/**
 * Shown after a double-click on an already-saved P/A/S mark, so a stray
 * single click can never silently change attendance that's already on
 * record.
 */
const ConfirmAttendanceUpdateModal = ({
  studentName,
  status,
  busy = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
        <h3>Update Attendance</h3>
        <p className="modal-confirm-text">
          Update <strong>{studentName}</strong>'s attendance to{" "}
          <strong>{STATUS_LABEL[status] || status}</strong>?
        </p>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAttendanceUpdateModal;
