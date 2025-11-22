// src/pages/DoctorAppointments.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getDoctorAppointments,
  updateDoctorAppointmentStatus,
} from "../services/doctorAppointments";

const statusColor = (status) => {
  if (!status) return "#555";
  const s = status.toLowerCase();
  if (s === "booked") return "#92400e";       // brown-ish
  if (s === "confirmed") return "#15803d";    // green
  if (s === "completed") return "#1d4ed8";    // blue
  if (s === "cancelled" || s === "canceled") return "#b91c1c"; // red
  return "#555";
};

function DoctorAppointments() {
  const { isAuthed, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [info, setInfo] = useState("");

  // guard – only doctors allowed
  if (!isAuthed || user?.role !== "doctor") {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: 24 }}>
          <h1>Doctor Dashboard</h1>
          <p className="subtitle">
            You must be logged in as a <b>doctor</b> to view this page.
          </p>
        </div>
      </div>
    );
  }

  async function load() {
    try {
      setLoading(true);
      setError("");
      setInfo("");
      const data = await getDoctorAppointments();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onChangeStatus(id, status) {
    try {
      setUpdatingId(id);
      setError("");
      setInfo("");
      const res = await updateDoctorAppointmentStatus(id, status);
      setInfo(res?.message || `Status updated to ${status}`);
      // refresh list
      const data = await getDoctorAppointments();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: 24 }}>
        <h1>Doctor Dashboard</h1>
        <p className="subtitle">
          View and manage your appointments.
        </p>

        {error && (
          <div className="helper" style={{ color: "#b91c1c", marginBottom: 8 }}>
            ⚠ {error}
          </div>
        )}
        {info && (
          <div className="helper" style={{ color: "#065f46", marginBottom: 8 }}>
            ✔ {info}
          </div>
        )}

        {loading ? (
          <div className="helper">Loading appointments…</div>
        ) : rows.length === 0 ? (
          <div className="helper">No appointments yet.</div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Patient</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td style={tdStyle}>{a.date}</td>
                    <td style={tdStyle}>{a.time}</td>
                    <td style={tdStyle}>
                      {a.patientName || "—"}
                    </td>
                    <td style={tdStyle}>
                      {a.patientEmail || "—"}
                      {a.patientPhone ? (
                        <>
                          <br />
                          <span className="helper">{a.patientPhone}</span>
                        </>
                      ) : null}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          backgroundColor: "#eff6ff",
                          color: statusColor(a.status),
                          textTransform: "capitalize",
                          fontWeight: 600,
                        }}
                      >
                        {a.status || "booked"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => onChangeStatus(a.id, "confirmed")}
                          disabled={
                            updatingId === a.id ||
                            (a.status && a.status.toLowerCase() === "confirmed")
                          }
                          style={smallBtn}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => onChangeStatus(a.id, "completed")}
                          disabled={updatingId === a.id}
                          style={smallBtn}
                        >
                          Complete
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => onChangeStatus(a.id, "cancelled")}
                          disabled={updatingId === a.id}
                          style={{
                            ...smallBtn,
                            background:
                              "linear-gradient(135deg, #b91c1c, #7f1d1d)",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0",
  padding: "8px",
  fontWeight: 600,
  fontSize: 14,
};

const tdStyle = {
  borderBottom: "1px solid #f1f5f9",
  padding: "8px",
  fontSize: 14,
  verticalAlign: "top",
};

const smallBtn = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  boxShadow: "none",
};

export default DoctorAppointments;
