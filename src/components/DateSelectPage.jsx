import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import api from "../api/axios";
import "../styles/DateSelectPage.css";

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// dateStr is always "YYYY-MM-DD" — parse it as local date parts so we never
// shift a day due to UTC conversion.
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

/**
 * First stop when marking attendance: pick a date (defaults to today) or
 * jump straight into any date that's already been practiced. Each date
 * gets its own dynamic attendance page at /attendance/:date.
 */
const DateSelectPage = () => {
  const navigate = useNavigate();
  const today = todayStr();

  const [selectedDate, setSelectedDate] = useState(today);
  const [practicedDates, setPracticedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/attendance/dates");
      setPracticedDates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  const openDate = (date) => {
    if (!date) return;
    navigate(`/attendance/${date}`);
  };

  return (
    <div className="date-select-page">
      <Navbar title="Select Attendance Date" onBack={() => navigate("/")} />

      <main className="date-select-main">
        <section className="date-picker-card">
          <h3>Mark attendance for a date</h3>
          <p className="date-picker-sub">
            Pick today, a past practice day, or any other date — each date gets its own
            attendance sheet.
          </p>
          <div className="date-picker-row">
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              className="date-picker-go-btn"
              onClick={() => openDate(selectedDate)}
              disabled={!selectedDate}
            >
              Open Attendance →
            </button>
          </div>
        </section>

        <section className="practiced-dates-card">
          <div className="practiced-dates-header">
            <h3>Practiced Dates</h3>
            {!loading && (
              <span className="practiced-dates-count">{practicedDates.length} total</span>
            )}
          </div>

          {loading ? (
            <div className="date-select-empty">Loading…</div>
          ) : practicedDates.length === 0 ? (
            <div className="date-select-empty">
              No attendance marked yet. Pick a date above to get started.
            </div>
          ) : (
            <div className="practiced-dates-grid">
              {practicedDates.map((date) => (
                <button
                  key={date}
                  className={`practiced-date-chip ${date === today ? "is-today" : ""}`}
                  onClick={() => openDate(date)}
                >
                  <span className="practiced-date-main">{formatDateLong(date)}</span>
                  <span className="practiced-date-sub">
                    {date}
                    {date === today ? " · Today" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DateSelectPage;
