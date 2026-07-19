import React, { useState } from "react";
import "../styles/Modal.css";

/**
 * Destructive-action confirmation that requires the user to type an exact
 * string (e.g. the date) before the Delete button is enabled. Used where a
 * simple "Are you sure?" click is too easy to hit by accident.
 */
const ConfirmTextModal = ({
  title,
  message,
  confirmValue,
  confirmLabel = "Delete",
  busy = false,
  onCancel,
  onConfirm,
}) => {
  const [input, setInput] = useState("");
  const matches = input.trim() === confirmValue;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="modal-confirm-text">{message}</p>
        <p className="modal-confirm-text">
          To confirm, type <strong>{confirmValue}</strong> below:
        </p>
        <div className="modal-form">
          <input
            type="text"
            value={input}
            autoFocus
            placeholder={confirmValue}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !busy) onConfirm();
            }}
          />
        </div>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="modal-btn-danger"
            onClick={onConfirm}
            disabled={!matches || busy}
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmTextModal;
