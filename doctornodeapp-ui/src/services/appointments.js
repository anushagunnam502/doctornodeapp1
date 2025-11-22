// src/services/appointments.js
import client from "../api/client";

// GET /api/appointments/mine
export async function getMyAppointments() {
  const { data } = await client.get("/api/appointments/mine");
  return Array.isArray(data) ? data : [];
}

// POST /api/appointments/:id/cancel
export async function cancelAppointment(id) {
  const { data } = await client.post(`/api/appointments/${id}/cancel`);
  return data; // { ok, message, appointment }
}

// POST /api/appointments/:id/reschedule
export async function rescheduleAppointment(id, { date, time }) {
  const { data } = await client.post(`/api/appointments/${id}/reschedule`, {
    date,
    time,
  });
  return data; // { ok, message, appointment }
}
