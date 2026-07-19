import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import Navbar from "./Navbar.jsx";
import VadanSection from "./VadanSection.jsx";
import SummarySection from "./SummarySection.jsx";
import UnsavedChangesModal from "./UnsavedChangesModal.jsx";
import api from "../api/axios";
import "../styles/AttendancePage.css";

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const isValidDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str || "");

const formatDateLong = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Dynamic, per-date attendance sheet. The date comes from the URL
// (/attendance/2026-07-20) so every date practiced gets its own page.
const AttendancePage = () => {
  const navigate = useNavigate();
  const { date: dateParam } = useParams();
  const today = useMemo(() => todayStr(), []);
  const date = isValidDate(dateParam) ? dateParam : today;

  // If someone lands on a malformed date in the URL, normalise it.
  useEffect(() => {
    if (dateParam && !isValidDate(dateParam)) {
      navigate(`/attendance/${today}`, { replace: true });
    }
  }, [dateParam, today, navigate]);

  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState("");

  // Each section reports its currently-visible rows here for the combined export
  const dholRowsRef = useRef([]);
  const tashaRowsRef = useRef([]);

  // Refs to the two VadanSection instances so we can force-save their
  // drafts when the user tries to leave with unsaved attendance.
  const dholSectionRef = useRef(null);
  const tashaSectionRef = useRef(null);

  const [dirtyMap, setDirtyMap] = useState({ Dhol: false, Tasha: false });
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [savingBeforeLeave, setSavingBeforeLeave] = useState(false);

  const isDirty = dirtyMap.Dhol || dirtyMap.Tasha;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const handleDirtyChange = useCallback((vadan, dirty) => {
    setDirtyMap((prev) => (prev[vadan] === dirty ? prev : { ...prev, [vadan]: dirty }));
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const { data } = await api.get("/attendance/summary", { params: { date } });
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  }, [date]);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  // --- Unsaved-changes guard -------------------------------------------

  // Warn on tab close / refresh while there's an unsaved draft.
  useEffect(() => {
    const handler = (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Intercept the browser's own back button while dirty. We push one guard
  // history entry the first time the page becomes dirty (not on every
  // dirty toggle, so a session that ends up clean again doesn't pick up
  // extra phantom "no-op" back presses), and swallow pops while dirty.
  const guardPushedRef = useRef(false);
  useEffect(() => {
    if (!isDirty) return;
    if (!guardPushedRef.current) {
      window.history.pushState(null, "", window.location.href);
      guardPushedRef.current = true;
    }
    const handlePopState = () => {
      if (!isDirtyRef.current) return; // let the browser navigate away normally
      window.history.pushState(null, "", window.location.href);
      setShowUnsavedModal(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  const goToDateSelect = useCallback(() => {
    navigate("/attendance");
  }, [navigate]);

  const handleBack = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
      return;
    }
    goToDateSelect();
  };

  const handleSaveAndLeave = async () => {
    setSavingBeforeLeave(true);
    try {
      await Promise.all([
        dholSectionRef.current?.isDirty ? dholSectionRef.current.saveDraft() : null,
        tashaSectionRef.current?.isDirty ? tashaSectionRef.current.saveDraft() : null,
      ]);
      showToast("Attendance saved");
      setShowUnsavedModal(false);
      goToDateSelect();
    } catch (err) {
      console.error(err);
      showToast("Failed to save attendance — please try again");
    } finally {
      setSavingBeforeLeave(false);
    }
  };

  const handleDiscardAndLeave = () => {
    setShowUnsavedModal(false);
    goToDateSelect();
  };

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    const dholSheet = XLSX.utils.json_to_sheet(dholRowsRef.current);
    XLSX.utils.book_append_sheet(workbook, dholSheet, "Dhol");

    const tashaSheet = XLSX.utils.json_to_sheet(tashaRowsRef.current);
    XLSX.utils.book_append_sheet(workbook, tashaSheet, "Tasha");

    XLSX.writeFile(workbook, `Dhol_Tasha_${date}.xlsx`);
  };

  return (
    <div className="attendance-page">
      <Navbar
        title={`Dhol & Tasha — ${formatDateLong(date)}`}
        onBack={handleBack}
      />

      <main className="attendance-main">
        <VadanSection
          ref={dholSectionRef}
          vadan="Dhol"
          date={date}
          onAttendanceChanged={refreshSummary}
          onToast={showToast}
          onDirtyChange={handleDirtyChange}
          onRowsChange={(rows) => {
            dholRowsRef.current = rows;
          }}
        />

        <VadanSection
          ref={tashaSectionRef}
          vadan="Tasha"
          date={date}
          onAttendanceChanged={refreshSummary}
          onToast={showToast}
          onDirtyChange={handleDirtyChange}
          onRowsChange={(rows) => {
            tashaRowsRef.current = rows;
          }}
        />

        <SummarySection summary={summary} />

        <div className="export-row">
          <button className="export-btn" onClick={handleExport}>
            ⬇ Export to Excel
          </button>
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}

      {showUnsavedModal && (
        <UnsavedChangesModal
          saving={savingBeforeLeave}
          onCancel={() => setShowUnsavedModal(false)}
          onDiscard={handleDiscardAndLeave}
          onSave={handleSaveAndLeave}
        />
      )}
    </div>
  );
};

export default AttendancePage;
