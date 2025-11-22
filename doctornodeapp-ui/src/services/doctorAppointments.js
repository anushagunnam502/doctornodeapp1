// src/services/doctorAppointments.js
import api from "../api/client";

// GET /api/appointments/doctor
export async function getDoctorAppointments() {
  const { data } = await api.get("/api/appointments/doctor");
  return Array.isArray(data) ? data : [];
}

// POST /api/appointments/:id/status
export async function updateDoctorAppointmentStatus(id, status) {
  const { data } = await api.post(`/api/appointments/${id}/status`, { status });
  return data; // { ok, message, appointment }
}
