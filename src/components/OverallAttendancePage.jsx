import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import Navbar from "./Navbar.jsx";
import OverallVadanSection from "./OverallVadanSection.jsx";
import "../styles/AttendancePage.css";
import "../styles/OverallAttendance.css";

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Overall attendance across every date that's ever been practiced, for both
// Dhol and Tasha. Reads/writes the same Attendance records as the per-date
// attendance page, so the two always stay in sync.
const OverallAttendancePage = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");

  const dholRowsRef = useRef([]);
  const tashaRowsRef = useRef([]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    const dholSheet = XLSX.utils.json_to_sheet(dholRowsRef.current);
    XLSX.utils.book_append_sheet(workbook, dholSheet, "Dhol");

    const tashaSheet = XLSX.utils.json_to_sheet(tashaRowsRef.current);
    XLSX.utils.book_append_sheet(workbook, tashaSheet, "Tasha");

    XLSX.writeFile(workbook, `Overall_Attendance_${todayStr()}.xlsx`);
  };

  return (
    <div className="attendance-page">
      <Navbar title="Overall Attendance" onBack={() => navigate("/")} />

      <main className="attendance-main">
        <OverallVadanSection
          vadan="Dhol"
          onToast={showToast}
          onRowsChange={(rows) => {
            dholRowsRef.current = rows;
          }}
        />

        <OverallVadanSection
          vadan="Tasha"
          onToast={showToast}
          onRowsChange={(rows) => {
            tashaRowsRef.current = rows;
          }}
        />

        <div className="export-row">
          <button className="export-btn" onClick={handleExport}>
            ⬇ Export Overall Attendance
          </button>
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default OverallAttendancePage;
