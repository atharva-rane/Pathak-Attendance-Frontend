import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import DateSelectPage from "./components/DateSelectPage.jsx";
import AttendancePage from "./components/AttendancePage.jsx";
import OverallAttendancePage from "./components/OverallAttendancePage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <DateSelectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/overall"
        element={
          <ProtectedRoute>
            <OverallAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/:date"
        element={
          <ProtectedRoute>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
