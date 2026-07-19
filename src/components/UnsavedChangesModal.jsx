import React from "react";
import "../styles/Modal.css";

/**
 * Shown when the user tries to leave the attendance page (Navbar back
 * button or the browser's own back button) while there are unsaved P/A/S
 * marks, so nothing gets lost by accident.
 */
const UnsavedChangesModal = ({ saving = false, onCancel, onDiscard, onSave }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
        <h3>Unsaved Attendance</h3>
        <p className="modal-confirm-text">
          You've marked attendance that hasn't been submitted yet. Save it before
          leaving this page?
        </p>
        <div className="modal-actions modal-actions-wrap">
          <button className="modal-btn-secondary" onClick={onCancel} disabled={saving}>
            Stay on Page
          </button>
          <button className="modal-btn-danger" onClick={onDiscard} disabled={saving}>
            Discard &amp; Leave
          </button>
          <button className="modal-btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save & Leave"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
