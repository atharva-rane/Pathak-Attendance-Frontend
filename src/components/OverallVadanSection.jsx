import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import StudentFormModal from "./StudentFormModal.jsx";
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx";
import ConfirmAttendanceUpdateModal from "./ConfirmAttendanceUpdateModal.jsx";
import api from "../api/axios";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "../styles/AttendancePage.css";
import "../styles/OverallAttendance.css";

// "2026-07-20" -> "20 Jul"
const formatDateShort = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// --- Cell renderers -------------------------------------------------

// One date column: same P / A / S buttons as the daily attendance page.
// Because this table holds the official record across every date, marking
// or changing a status that's already saved requires a double-click plus
// a confirmation popup — a single click alone can never change it.
const DateAttendanceCellRenderer = (props) => {
  const { data, context, date } = props;
  const status = data.attendance?.[date];
  const isSaved = !!status;

  return (
    <div className="attendance-btns attendance-btns-compact">
      {["Present", "Absent", "Seva"].map((opt) => {
        const cls = opt === "Present" ? "present" : opt === "Absent" ? "absent" : "seva";
        const label = opt === "Present" ? "P" : opt === "Absent" ? "A" : "S";
        return (
          <button
            key={opt}
            className={`att-btn att-btn-sm ${cls} ${status === opt ? "active" : ""}`}
            onClick={() => context.onQuickMark(data._id, date, opt, data.fullName, isSaved)}
            onDoubleClick={() =>
              context.onDoubleMark(data._id, date, opt, data.fullName, isSaved)
            }
            title={opt === "Seva" ? "Absent (Went for Seva)" : opt}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

const PercentageCellRenderer = (props) => {
  const pct = props.data.percentage ?? 0;
  const cls = pct >= 75 ? "pct-high" : pct >= 50 ? "pct-mid" : "pct-low";
  return <span className={`pct-badge ${cls}`}>{pct}%</span>;
};

const EditCellRenderer = (props) => (
  <button className="icon-btn" title="Edit" onClick={() => props.context.onEdit(props.data)}>
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

// --- Section ---------------------------------------------------------

/**
 * Overall attendance for one group ("Dhol" or "Tasha") across every date
 * that's ever been practiced. Same student list + same Attendance records
 * as the per-date page — marking here updates the same record a student
 * would see on their date's attendance page, and vice versa.
 */
const OverallVadanSection = ({ vadan, onToast, onRowsChange }) => {
  const [students, setStudents] = useState([]);
  const [dates, setDates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [pendingUpdate, setPendingUpdate] = useState(null); // {studentId, date, status, studentName}
  const [updating, setUpdating] = useState(false);

  const [selectedRowId, setSelectedRowId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/attendance/overall", { params: { vadan } });
      setDates(data.dates);
      setStudents(data.students);
      setSelectedRowId(null);
    } catch (err) {
      console.error(err);
      onToast(`Failed to load ${vadan} overall data`);
    } finally {
      setLoading(false);
    }
  }, [vadan, onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyMark = async (studentId, date, status) => {
    // Optimistic update so the P/A/S badge and percentage react instantly.
    setStudents((prev) =>
      prev.map((s) => {
        if (s._id !== studentId) return s;
        const attendance = { ...s.attendance, [date]: status };
        const presentCount = dates.reduce(
          (count, d) => count + (attendance[d] === "Present" ? 1 : 0),
          0,
        );
        const percentage =
          s.totalDates > 0 ? Number(((presentCount / s.totalDates) * 100).toFixed(1)) : 0;
        return { ...s, attendance, presentCount, percentage };
      }),
    );

    try {
      await api.post("/attendance", { studentId, date, status });
    } catch (err) {
      onToast("Failed to update attendance");
      loadData();
    }
  };

  // Single click: only allowed to freely set attendance that hasn't been
  // marked for that date yet. Changing an already-marked date requires a
  // double-click and confirmation.
  const handleQuickMark = (studentId, date, status, studentName, isSaved) => {
    if (!isSaved) {
      applyMark(studentId, date, status);
    }
    // if already saved, single click is intentionally ignored
  };

  const handleDoubleMark = (studentId, date, status, studentName, isSaved) => {
    if (!isSaved) {
      applyMark(studentId, date, status);
      return;
    }
    setPendingUpdate({ studentId, date, status, studentName });
  };

  const confirmPendingUpdate = async () => {
    if (!pendingUpdate) return;
    setUpdating(true);
    try {
      await applyMark(pendingUpdate.studentId, pendingUpdate.date, pendingUpdate.status);
    } finally {
      setUpdating(false);
      setPendingUpdate(null);
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
  };

  const handleDelete = (student) => setDeletingStudent(student);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/students/${deletingStudent._id}`);
      onToast("Student deleted");
      setDeletingStudent(null);
      loadData();
    } catch (err) {
      onToast("Failed to delete student");
    } finally {
      setDeleting(false);
    }
  };

  const rowData = useMemo(() => {
    const merged = [...students];
    merged.sort((a, b) => a.firstName.localeCompare(b.firstName));
    return merged;
  }, [students]);

  const filteredRowData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rowData;
    return rowData.filter(
      (r) =>
        r.fullName?.toLowerCase().includes(term) ||
        r.contactNumber?.toLowerCase().includes(term) ||
        r.gender?.toLowerCase().includes(term),
    );
  }, [rowData, searchTerm]);

  // Report current rows up to the parent for the combined overall export
  useEffect(() => {
    onRowsChange(
      filteredRowData.map((r, idx) => {
        const row = {
          "Sr No": idx + 1,
          "Full Name": r.fullName,
          "Contact Number": r.contactNumber,
          Gender: r.gender,
        };
        dates.forEach((d) => {
          row[d] = r.attendance?.[d] || "Not Marked";
        });
        row["Total Present"] = `${r.presentCount}/${r.totalDates}`;
        row["Percentage"] = `${r.percentage}%`;
        return row;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRowData, dates]);

  const columnDefs = useMemo(() => {
    const dateCols = dates.map((date) => ({
      headerName: formatDateShort(date),
      headerTooltip: date,
      colId: `date_${date}`,
      width: 108,
      minWidth: 100,
      sortable: false,
      filter: false,
      cellRenderer: DateAttendanceCellRenderer,
      cellRendererParams: { date },
      headerClass: "header-center",
      cellClass: "cell-center",
    }));

    return [
      {
        headerName: "Sr No",
        valueGetter: (params) => params.node.rowIndex + 1,
        width: 80,
        pinned: "left",
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Full Name",
        field: "fullName",
        pinned: "left",
        flex: 1.3,
        minWidth: 170,
        headerClass: "header-center",
        cellClass: "cell-left",
      },
      {
        headerName: "Contact Number",
        field: "contactNumber",
        width: 140,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Gender",
        field: "gender",
        width: 100,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      ...dateCols,
      {
        headerName: "Total Present",
        valueGetter: (params) => `${params.data.presentCount}/${params.data.totalDates}`,
        width: 130,
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Percentage",
        cellRenderer: PercentageCellRenderer,
        width: 115,
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Edit",
        cellRenderer: EditCellRenderer,
        width: 75,
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
      {
        headerName: "Delete",
        cellRenderer: DeleteCellRenderer,
        width: 85,
        sortable: false,
        filter: false,
        headerClass: "header-center",
        cellClass: "cell-center",
      },
    ];
  }, [dates]);

  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

  const gridContext = useMemo(
    () => ({
      onQuickMark: handleQuickMark,
      onDoubleMark: handleDoubleMark,
      onEdit: handleEdit,
      onDelete: handleDelete,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dates, students],
  );

  const rowClassRules = useMemo(
    () => ({
      "row-selected": (params) => params.data?._id === selectedRowId,
    }),
    [selectedRowId],
  );

  return (
    <section className={`vadan-section overall-section vadan-section-${vadan.toLowerCase()}`}>
      <div className="vadan-section-header">
        <h3>{vadan} — Overall Attendance</h3>
        <span className="vadan-count">{students.length} students · {dates.length} practices</span>
      </div>

      <div className="toolbar">
        <button className="toolbar-add-btn" onClick={handleAddClick}>
          + Add New Student
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder={`Search ${vadan} by name, contact number, or gender…`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {dates.length === 0 && !loading ? (
        <div className="overall-empty">
          No attendance has been marked on any date yet. Once you mark attendance on the
          attendance page, it will show up here.
        </div>
      ) : (
        <>
          <div className="overall-scroll-hint">↔ Scroll horizontally to see every practiced date</div>
          <div className="ag-theme-alpine attendance-grid-wrapper overall-grid-wrapper">
            <AgGridReact
              rowData={filteredRowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              context={gridContext}
              domLayout="autoHeight"
              animateRows
              loading={loading}
              tooltipShowDelay={200}
              rowClassRules={rowClassRules}
              onRowClicked={(params) => setSelectedRowId(params.data?._id ?? null)}
              overlayNoRowsTemplate={`<span>No ${vadan} students yet. Click "Add New Student" to get started.</span>`}
            />
          </div>
        </>
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

      {pendingUpdate && (
        <ConfirmAttendanceUpdateModal
          studentName={pendingUpdate.studentName}
          status={pendingUpdate.status}
          busy={updating}
          onCancel={() => setPendingUpdate(null)}
          onConfirm={confirmPendingUpdate}
        />
      )}
    </section>
  );
};

export default OverallVadanSection;
