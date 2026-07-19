import React from "react";
import "../styles/Modal.css";

const ConfirmDeleteModal = ({ studentName, onCancel, onConfirm, deleting }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Student</h3>
        <p className="modal-confirm-text">
          Do you want to delete student: <strong>{studentName}</strong>?
        </p>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
