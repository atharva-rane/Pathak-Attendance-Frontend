import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { AgGridReact } from "ag-grid-react";
import StudentFormModal from "./StudentFormModal.jsx";
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx";
import ConfirmAttendanceUpdateModal from "./ConfirmAttendanceUpdateModal.jsx";
import RemainingAttendanceModal from "./RemainingAttendanceModal.jsx";
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

const MobileAttendanceRow = ({
  student,
  status,
  isSaved,
  isRowSelected,
  isMenuOpen,
  onToggleMenu,
  onSelectRow,
  onQuickMark,
  onDoubleMark,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`mobile-att-row ${isRowSelected ? "row-selected" : ""}`}
      onClick={() => onSelectRow(student._id)}
    >
      <button
        className="mobile-att-name"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMenu(student._id);
        }}
        title="Tap for options"
      >
        {student.fullName}
      </button>

      <div className="attendance-btns">
        {["Present", "Absent", "Seva"].map((opt) => {
          const cls = opt === "Present" ? "present" : opt === "Absent" ? "absent" : "seva";
          const label = opt === "Present" ? "P" : opt === "Absent" ? "A" : "S";
          return (
            <button
              key={opt}
              className={`att-btn ${cls} ${status === opt ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickMark(student._id, opt, student.fullName, isSaved);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleMark(student._id, opt, student.fullName, isSaved);
              }}
              title={opt === "Seva" ? "Absent (Went for Seva)" : opt}
            >
              {label}
            </button>
          );
        })}
      </div>

      {isMenuOpen && (
        <div className="mobile-att-menu" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              onToggleMenu(null);
              onEdit(student);
            }}
          >
            ✎ Edit
          </button>
          <button
            className="danger"
            onClick={() => {
              onToggleMenu(null);
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
  const status = context.draftMap[data._id] || "Not Marked";
  const isSaved = !!context.savedMap[data._id];

  return (
    <div className="attendance-btns">
      {["Present", "Absent", "Seva"].map((opt) => {
        const cls = opt === "Present" ? "present" : opt === "Absent" ? "absent" : "seva";
        const label = opt === "Present" ? "P" : opt === "Absent" ? "A" : "S";
        return (
          <button
            key={opt}
            className={`att-btn ${cls} ${status === opt ? "active" : ""}`}
            onClick={() => context.onQuickMark(data._id, opt, data.fullName, isSaved)}
            onDoubleClick={() => context.onDoubleMark(data._id, opt, data.fullName, isSaved)}
            title={opt === "Seva" ? "Absent (Went for Seva)" : opt}
          >
            {label}
          </button>
        );
      })}
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
 *
 * Attendance marking works as a local draft: P/A/S clicks only update
 * in-memory state until "Submit Attendance" is pressed, which is when
 * everything actually gets saved to the server. Changing a mark that's
 * already been saved requires a double-click + confirmation, as an extra
 * safety net against accidental edits.
 */
const VadanSection = forwardRef(
  ({ vadan, date, onAttendanceChanged, onToast, onRowsChange, onDirtyChange }, ref) => {
    const isMobile = useIsMobile();
    const [students, setStudents] = useState([]);
    const [savedMap, setSavedMap] = useState({});
    const [draftMap, setDraftMap] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [deletingStudent, setDeletingStudent] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [pendingUpdate, setPendingUpdate] = useState(null); // {studentId, status, studentName}
    const [updating, setUpdating] = useState(false);
    const [remainingNames, setRemainingNames] = useState(null); // array | null

    const [selectedRowId, setSelectedRowId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

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
        setSavedMap(map);
        setDraftMap({ ...map });
        setSelectedRowId(null);
        setOpenMenuId(null);
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

    // --- Draft dirty-state -------------------------------------------

    const isDirty = useMemo(() => {
      return students.some(
        (s) => (draftMap[s._id] || null) !== (savedMap[s._id] || null),
      );
    }, [students, draftMap, savedMap]);

    useEffect(() => {
      onDirtyChange?.(vadan, isDirty);
    }, [isDirty, vadan, onDirtyChange]);

    const remainingCount = useMemo(
      () => students.filter((s) => !draftMap[s._id]).length,
      [students, draftMap],
    );

    // --- Marking (draft-only) -----------------------------------------

    const setDraft = (studentId, status) => {
      setDraftMap((prev) => ({ ...prev, [studentId]: status }));
    };

    // Single click: only allowed to freely set a mark that hasn't been
    // saved to the server yet. If it's already saved, a single click is a
    // no-op — the user must double-click and confirm to change it.
    const handleQuickMark = (studentId, status, studentName, isSaved) => {
      if (!isSaved) {
        setDraft(studentId, status);
        return;
      }
      if (draftMap[studentId] === status) return; // already selected, nothing to do
    };

    const handleDoubleMark = (studentId, status, studentName, isSaved) => {
      if (!isSaved) {
        setDraft(studentId, status);
        return;
      }
      if (draftMap[studentId] === status) return;
      setPendingUpdate({ studentId, status, studentName });
    };

    const confirmPendingUpdate = () => {
      if (!pendingUpdate) return;
      setUpdating(true);
      setDraft(pendingUpdate.studentId, pendingUpdate.status);
      setUpdating(false);
      setPendingUpdate(null);
    };

    // --- Submit ---------------------------------------------------------

    const handleSubmit = async () => {
      if (remainingCount > 0) {
        const names = students
          .filter((s) => !draftMap[s._id])
          .map((s) => s.fullName);
        setRemainingNames(names);
        return;
      }

      const changed = students.filter(
        (s) => (draftMap[s._id] || null) !== (savedMap[s._id] || null),
      );

      if (changed.length === 0) {
        onToast(`${vadan} attendance already up to date`);
        return;
      }

      setSubmitting(true);
      try {
        await Promise.all(
          changed.map((s) =>
            api.post("/attendance", {
              studentId: s._id,
              date,
              status: draftMap[s._id],
            }),
          ),
        );
        setSavedMap((prev) => {
          const next = { ...prev };
          changed.forEach((s) => {
            next[s._id] = draftMap[s._id];
          });
          return next;
        });
        onAttendanceChanged();
        onToast(`${vadan} attendance submitted`);
      } catch (err) {
        console.error(err);
        onToast(`Failed to submit ${vadan} attendance`);
      } finally {
        setSubmitting(false);
      }
    };

    // Used by the parent's unsaved-changes guard (back navigation). Saves
    // whatever is currently marked in the draft, without requiring every
    // student to be marked first.
    const saveDraft = useCallback(async () => {
      const changed = students.filter(
        (s) => (draftMap[s._id] || null) !== (savedMap[s._id] || null),
      );
      if (changed.length === 0) return;

      await Promise.all(
        changed.map((s) =>
          api.post("/attendance", {
            studentId: s._id,
            date,
            status: draftMap[s._id],
          }),
        ),
      );
      setSavedMap((prev) => {
        const next = { ...prev };
        changed.forEach((s) => {
          next[s._id] = draftMap[s._id];
        });
        return next;
      });
      onAttendanceChanged();
    }, [students, draftMap, savedMap, date, onAttendanceChanged]);

    useImperativeHandle(
      ref,
      () => ({
        isDirty,
        saveDraft,
      }),
      [isDirty, saveDraft],
    );

    // --- Student CRUD ----------------------------------------------------

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

    // --- Row data ---------------------------------------------------------

    const rowData = useMemo(() => {
      const merged = students.map((s) => ({
        ...s,
        attendanceStatus: draftMap[s._id] || "Not Marked",
      }));
      merged.sort((a, b) => a.firstName.localeCompare(b.firstName));
      return merged;
    }, [students, draftMap]);

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
      () => ({
        onQuickMark: handleQuickMark,
        onDoubleMark: handleDoubleMark,
        onEdit: handleEdit,
        onDelete: handleDelete,
        draftMap,
        savedMap,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [draftMap, savedMap],
    );

    const rowClassRules = useMemo(
      () => ({
        "row-selected": (params) => params.data?._id === selectedRowId,
      }),
      [selectedRowId],
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
        .mobile-att-row.row-selected {
          background: #ecdfc7;
          border-color: var(--saffron);
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
          <div className="toolbar-date">Date: {date}</div>
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
                  status={draftMap[student._id] || "Not Marked"}
                  isSaved={!!savedMap[student._id]}
                  isRowSelected={selectedRowId === student._id}
                  isMenuOpen={openMenuId === student._id}
                  onToggleMenu={(id) =>
                    setOpenMenuId((prev) => (prev === id ? null : id))
                  }
                  onSelectRow={setSelectedRowId}
                  onQuickMark={handleQuickMark}
                  onDoubleMark={handleDoubleMark}
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
              rowClassRules={rowClassRules}
              onRowClicked={(params) => setSelectedRowId(params.data?._id ?? null)}
              overlayNoRowsTemplate={`<span>No ${vadan} students yet. Click "Add New Student" to get started.</span>`}
            />
          </div>
        )}

        <div className="attendance-submit-row">
          <span className="remaining-to-mark">
            {students.length === 0
              ? ""
              : remainingCount === 0
                ? "All students marked ✓"
                : `${remainingCount} student${remainingCount > 1 ? "s" : ""} remaining to mark`}
          </span>
          <button
            className="submit-attendance-btn"
            onClick={handleSubmit}
            disabled={submitting || students.length === 0}
          >
            {submitting ? "Submitting…" : "Submit Attendance"}
          </button>
        </div>

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

        {remainingNames && (
          <RemainingAttendanceModal
            vadan={vadan}
            names={remainingNames}
            onClose={() => setRemainingNames(null)}
          />
        )}
      </section>
    );
  },
);

VadanSection.displayName = "VadanSection";

export default VadanSection;
