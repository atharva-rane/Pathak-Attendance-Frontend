import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import StudentFormModal from "./StudentFormModal.jsx";
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx";
import api from "../api/axios";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "../styles/AttendancePage.css";

// Below this width, show the compact mobile list instead of the full grid.
const MOBILE_BREAKPOINT = 768;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
};

// --- Mobile compact row --------------------------------------------

const MobileAttendanceRow = ({ student, onMark, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = student.attendanceStatus;

  return (
    <div className="mobile-att-row">
      <button
        className="mobile-att-name"
        onClick={() => setMenuOpen((v) => !v)}
        title="Tap for options"
      >
        {student.fullName}
      </button>

      <div className="attendance-btns">
        <button
          className={`att-btn present ${status === "Present" ? "active" : ""}`}
          onClick={() => onMark(student._id, "Present")}
          title="Present"
        >
          P
        </button>
        <button
          className={`att-btn absent ${status === "Absent" ? "active" : ""}`}
          onClick={() => onMark(student._id, "Absent")}
          title="Absent"
        >
          A
        </button>
        <button
          className={`att-btn seva ${status === "Seva" ? "active" : ""}`}
          onClick={() => onMark(student._id, "Seva")}
          title="Absent (Went for Seva)"
        >
          S
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-att-menu">
          <button
            onClick={() => {
              setMenuOpen(false);
              onEdit(student);
            }}
          >
            ✎ Edit
          </button>
          <button
            className="danger"
            onClick={() => {
              setMenuOpen(false);
              onDelete(student);
            }}
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
};

// --- Cell renderers -------------------------------------------------

const AttendanceCellRenderer = (props) => {
  const { data, context } = props;
  const status = data.attendanceStatus;
  return (
    <div className="attendance-btns">
      <button
        className={`att-btn present ${status === "Present" ? "active" : ""}`}
        onClick={() => context.onMark(data._id, "Present")}
        title="Present"
      >
        P
      </button>
      <button
        className={`att-btn absent ${status === "Absent" ? "active" : ""}`}
        onClick={() => context.onMark(data._id, "Absent")}
        title="Absent"
      >
        A
      </button>
      <button
        className={`att-btn seva ${status === "Seva" ? "active" : ""}`}
        onClick={() => context.onMark(data._id, "Seva")}
        title="Absent (Went for Seva)"
      >
        S
      </button>
    </div>
  );
};

const EditCellRenderer = (props) => (
  <button
    className="icon-btn"
    title="Edit"
    onClick={() => props.context.onEdit(props.data)}
  >
    ✎
  </button>
);

const DeleteCellRenderer = (props) => (
  <button
    className="icon-btn icon-btn-danger"
    title="Delete"
    onClick={() => props.context.onDelete(props.data)}
  >
    🗑
  </button>
);

// --- Section ------------------------------------------------------

/**
 * Renders one group's ("Dhol" or "Tasha") toolbar, search box, and grid.
 * Reports row data + attendance changes up to the parent page so it can
 * drive the combined summary and export.
 */
const VadanSection = ({
  vadan,
  date,
  onAttendanceChanged,
  onToast,
  onRowsChange,
}) => {
  const isMobile = useIsMobile();
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        api.get("/students", { params: { vadan } }),
        api.get("/attendance", { params: { date, vadan } }),
      ]);

      const map = {};
      attendanceRes.data.forEach((rec) => {
        map[rec.student] = rec.status;
      });

      setStudents(studentsRes.data);
      setAttendanceMap(map);
    } catch (err) {
      console.error(err);
      onToast(`Failed to load ${vadan} data`);
    } finally {
      setLoading(false);
    }
  }, [vadan, date, onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMark = async (studentId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
    try {
      await api.post("/attendance", { studentId, date, status });
      onAttendanceChanged();
    } catch (err) {
      onToast("Failed to mark attendance");
      loadData();
    }
  };

  const handleAddClick = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleFormSubmit = async (form) => {
    if (editingStudent) {
      await api.put(`/students/${editingStudent._id}`, form);
      onToast("Student updated successfully");
    } else {
      await api.post("/students", form);
      onToast("New student added");
    }
    setShowForm(false);
    setEditingStudent(null);
    loadData();
    onAttendanceChanged();
  };

  const handleDelete = (student) => setDeletingStudent(student);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/students/${deletingStudent._id}`);
      onToast("Student deleted");
      setDeletingStudent(null);
      loadData();
      onAttendanceChanged();
    } catch (err) {
      onToast("Failed to delete student");
    } finally {
      setDeleting(false);
    }
  };

  const rowData = useMemo(() => {
    const merged = students.map((s) => ({
      ...s,
      attendanceStatus: attendanceMap[s._id] || "Not Marked",
    }));
    merged.sort((a, b) => a.firstName.localeCompare(b.firstName));
    return merged;
  }, [students, attendanceMap]);

  const filteredRowData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rowData;
    return rowData.filter((r) => {
      return (
        r.fullName?.toLowerCase().includes(term) ||
        r.contactNumber?.toLowerCase().includes(term) ||
        r.attendanceStatus?.toLowerCase().includes(term) ||
        (term === "present" && r.attendanceStatus === "Present") ||
        (term === "absent" &&
          (r.attendanceStatus === "Absent" || r.attendanceStatus === "Seva"))
      );
    });
  }, [rowData, searchTerm]);

  // Report current rows up to the parent for combined export
  useEffect(() => {
    onRowsChange(
      filteredRowData.map((r, idx) => ({
        "Sr No": idx + 1,
        "Full Name": r.fullName,
        "Contact Number": r.contactNumber,
        Gender: r.gender,
        Vadan: r.vadan,
        Attendance: r.attendanceStatus,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRowData]);

  const columnDefs = useMemo(
    () => [
      {
        headerName: "Sr No",
        valueGetter: (params) => params.node.rowIndex + 1,
        width: 90,
        pinned: "left",
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Full Name",
        field: "fullName",
        flex: 1.4,
        minWidth: 180,
        headerClass: "header-center",
        cellClass: "cell-left",
      },
      {
        headerName: "Contact Number",
        field: "contactNumber",
        flex: 1,
        minWidth: 140,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Gender",
        field: "gender",
        width: 110,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Mark Attendance",
        cellRenderer: AttendanceCellRenderer,
        flex: 1.1,
        minWidth: 190,
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Edit",
        cellRenderer: EditCellRenderer,
        width: 80,
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Delete",
        cellRenderer: DeleteCellRenderer,
        width: 90,
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({ resizable: true, sortable: true, filter: true }),
    [],
  );

  const gridContext = useMemo(
    () => ({ onMark: handleMark, onEdit: handleEdit, onDelete: handleDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attendanceMap],
  );

  return (
    <section className={`vadan-section vadan-section-${vadan.toLowerCase()}`}>
      <style>{`
        .mobile-att-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .mobile-att-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #888;
        }
        .mobile-att-row {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid #e2e2e2;
          border-radius: 10px;
          background: #fff;
        }
        .mobile-att-name {
          flex: 1;
          text-align: left;
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 600;
          padding: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-att-menu {
          position: absolute;
          top: 100%;
          left: 12px;
          z-index: 5;
          margin-top: 4px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          overflow: hidden;
        }
        .mobile-att-menu button {
          display: block;
          width: 100%;
          padding: 10px 16px;
          text-align: left;
          background: none;
          border: none;
          font-size: 14px;
        }
        .mobile-att-menu button.danger { color: #c0392b; }
        .mobile-att-empty { padding: 20px 8px; text-align: center; color: #777; font-size: 14px; }
      `}</style>
      <div className="vadan-section-header">
        <h3>{vadan}</h3>
        <span className="vadan-count">{students.length} students</span>
      </div>

      <div className="toolbar">
        <button className="toolbar-add-btn" onClick={handleAddClick}>
          + Add New Student
        </button>
        <div className="toolbar-date">Today: {date}</div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder={`Search ${vadan} by name, contact number, Present, or Absent…`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isMobile ? (
        <div className="mobile-att-list">
          {!loading && filteredRowData.length > 0 && (
            <div className="mobile-att-header">
              <span>Name</span>
              <span>Attendance</span>
            </div>
          )}
          {loading ? (
            <div className="mobile-att-empty">Loading…</div>
          ) : filteredRowData.length === 0 ? (
            <div className="mobile-att-empty">
              No {vadan} students yet. Tap "Add New Student" to get started.
            </div>
          ) : (
            filteredRowData.map((student) => (
              <MobileAttendanceRow
                key={student._id}
                student={student}
                onMark={handleMark}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      ) : (
        <div className="ag-theme-alpine attendance-grid-wrapper">
          <AgGridReact
            rowData={filteredRowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            context={gridContext}
            domLayout="autoHeight"
            animateRows
            loading={loading}
            overlayNoRowsTemplate={`<span>No ${vadan} students yet. Click "Add New Student" to get started.</span>`}
          />
        </div>
      )}

      {showForm && (
        <StudentFormModal
          vadan={vadan}
          initialData={editingStudent}
          onClose={() => {
            setShowForm(false);
            setEditingStudent(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {deletingStudent && (
        <ConfirmDeleteModal
          studentName={deletingStudent.fullName}
          onCancel={() => setDeletingStudent(null)}
          onConfirm={confirmDelete}
          deleting={deleting}
        />
      )}
    </section>
  );
};

export default VadanSection;
