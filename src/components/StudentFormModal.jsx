import React, { useEffect, useState } from "react";
import "../styles/Modal.css";

const emptyForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  vadan: "Dhol",
  contactNumber: "",
  gender: "Male",
};

const StudentFormModal = ({ vadan, initialData, onClose, onSubmit }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      setForm({
        firstName: initialData.firstName || "",
        middleName: initialData.middleName || "",
        lastName: initialData.lastName || "",
        vadan: initialData.vadan || vadan,
        contactNumber: initialData.contactNumber || "",
        gender: initialData.gender || "Male",
      });
    } else {
      setForm({ ...emptyForm, vadan });
    }
  }, [initialData, vadan]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim() || !form.contactNumber.trim()) {
      setError("First name, last name and contact number are required.");
      return;
    }
    if (!/^\d{7,15}$/.test(form.contactNumber.trim())) {
      setError("Please enter a valid contact number (digits only).");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? "Edit Student" : "Add New Student"}</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-row">
            <label>
              First Name*
              <input value={form.firstName} onChange={handleChange("firstName")} autoFocus />
            </label>
            <label>
              Middle Name
              <input value={form.middleName} onChange={handleChange("middleName")} />
            </label>
          </div>

          <div className="modal-row">
            <label>
              Last Name*
              <input value={form.lastName} onChange={handleChange("lastName")} />
            </label>
            <label>
              Vadan*
              <select value={form.vadan} onChange={handleChange("vadan")}>
                <option value="Dhol">Dhol</option>
                <option value="Tasha">Tasha</option>
              </select>
            </label>
          </div>

          <div className="modal-row">
            <label>
              Contact Number*
              <input
                value={form.contactNumber}
                onChange={handleChange("contactNumber")}
                placeholder="9876543210"
                inputMode="numeric"
              />
            </label>
            <label>
              Gender*
              <select value={form.gender} onChange={handleChange("gender")}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFormModal;
