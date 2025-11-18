import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyAppointments,
  cancelAppointment,
} from "../services/appointments";
import { useAuth } from "../context/AuthContext";

const statusColor = (status) => {
  if (!status) return "#555";
  const s = status.toLowerCase();
  if (s === "booked" || s === "confirmed") return "green";
  if (s === "cancelled" || s === "canceled") return "red";
  if (s === "completed") return "blue";
  return "#555";
};

function MyAppointments() {
  const { token, isAuthed } = useAuth();
  const nav = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null); // for cancel in progress

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!isAuthed || !token) {
        setError("You must be logged in to see your appointments.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await getMyAppointments();
        if (isMounted) {
          setAppointments(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message || "Failed to load appointments");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [isAuthed, token]);

  async function onCancel(appt) {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      setBusyId(appt.id);
      const res = await cancelAppointment(appt.id);
      const updated = res?.appointment;

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appt.id
            ? updated || { ...a, status: "cancelled" }
            : a
        )
      );
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  function onReschedule(appt) {
    // Send to booking screen with pre-filled doctor/date/time + appointmentId
    nav(
      `/book?doctorId=${encodeURIComponent(
        appt.doctorId
      )}&date=${encodeURIComponent(
        appt.date
      )}&time=${encodeURIComponent(appt.time)}&appointmentId=${appt.id}`
    );
  }

  if (loading) {
    return <div style={{ padding: "16px" }}>Loading your appointments...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "16px", color: "red" }}>
        Error: {error}
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <div style={{ padding: "16px" }}>
        You don’t have any appointments yet.
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: 24 }}>
        <h1>My Appointments</h1>
        <p className="subtitle">
          View, cancel, or reschedule your upcoming visits.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "12px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Doctor</th>
                <th style={thStyle}>City</th>
                <th style={thStyle}>Fee</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const isCancelled =
                  a.status &&
                  a.status.toLowerCase().startsWith("cancel");
                const isCompleted =
                  a.status &&
                  a.status.toLowerCase() === "completed";

                return (
                  <tr key={a.id}>
                    <td style={tdStyle}>{a.date}</td>
                    <td style={tdStyle}>{a.time}</td>
                    <td style={tdStyle}>{a.doctorName}</td>
                    <td style={tdStyle}>{a.city}</td>
                    <td style={tdStyle}>
                      {a.fee != null ? `$${a.fee}` : "-"}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          backgroundColor: "#f0f0f0",
                          color: statusColor(a.status),
                          textTransform: "capitalize",
                        }}
                      >
                        {a.status || "booked"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn"
                          style={{
                            padding: "6px 10px",
                            fontSize: 12,
                            background:
                              "linear-gradient(135deg,#f97316,#ea580c)",
                          }}
                          onClick={() => onReschedule(a)}
                          disabled={isCancelled || isCompleted}
                        >
                          Reschedule
                        </button>
                        <button
                          className="btn"
                          style={{
                            padding: "6px 10px",
                            fontSize: 12,
                            background:
                              "linear-gradient(135deg,#ef4444,#b91c1c)",
                          }}
                          onClick={() => onCancel(a)}
                          disabled={isCancelled || isCompleted || busyId === a.id}
                        >
                          {busyId === a.id ? "Cancelling…" : "Cancel"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "8px",
  fontWeight: 600,
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: "8px",
};

export default MyAppointments;
