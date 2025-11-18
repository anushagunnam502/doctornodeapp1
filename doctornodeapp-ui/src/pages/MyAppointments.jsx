import React, { useEffect, useState } from "react";
import { getMyAppointments } from "../services/appointments";
import { useAuth } from "../context/AuthContext"; // 🔹 get token from context

const statusColor = (status) => {
  if (!status) return "#555";
  const s = status.toLowerCase();
  if (s === "booked" || s === "confirmed") return "green";
  if (s === "cancelled" || s === "canceled") return "red";
  if (s === "completed") return "blue";
  return "#555";
};

function MyAppointments() {
  const { token } = useAuth(); // 🔹 token from auth context
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!token) {
        setError("You must be logged in to see your appointments.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await getMyAppointments(token); // 🔹 pass token
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
  }, [token]);

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
    <div style={{ padding: "16px" }}>
      <h2>My Appointments</h2>

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
              <th style={thStyle}>Doctor</th> {/* 🔹 fixed closing tag */}
              <th style={thStyle}>City</th>
              <th style={thStyle}>Fee</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
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
              </tr>
            ))}
          </tbody>
        </table>
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
