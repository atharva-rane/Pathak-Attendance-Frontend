import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import Navbar from "./Navbar.jsx";
import VadanSection from "./VadanSection.jsx";
import SummarySection from "./SummarySection.jsx";
import api from "../api/axios";
import "../styles/AttendancePage.css";

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const AttendancePage = () => {
  const navigate = useNavigate();
  const date = useMemo(() => todayStr(), []);

  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState("");

  // Each section reports its currently-visible rows here for the combined export
  const dholRowsRef = useRef([]);
  const tashaRowsRef = useRef([]);

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
      <Navbar title="Dhol & Tasha — Mark Attendance" onBack={() => navigate("/")} />

      <main className="attendance-main">
        <VadanSection
          vadan="Dhol"
          date={date}
          onAttendanceChanged={refreshSummary}
          onToast={showToast}
          onRowsChange={(rows) => {
            dholRowsRef.current = rows;
          }}
        />

        <VadanSection
          vadan="Tasha"
          date={date}
          onAttendanceChanged={refreshSummary}
          onToast={showToast}
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
    </div>
  );
};

export default AttendancePage;
