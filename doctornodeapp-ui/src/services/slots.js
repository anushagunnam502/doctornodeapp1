// src/services/slots.js
import api from "../api/client";

// 1) Load doctors from real API (protected; token handled by interceptor)
export async function fetchDoctors() {
  const { data } = await api.get("/api/doctors");
  return Array.isArray(data) ? data : [];
}

// 2) Load slots from real backend
// GET /api/slots?doctorId=1&date=YYYY-MM-DD
export async function fetchSlots({ doctorId, dateISO }) {
  if (!doctorId || !dateISO) return [];
  const { data } = await api.get("/api/slots", {
    params: {
      doctorId,
      date: dateISO, // backend expects `date`
    },
  });
  return Array.isArray(data) ? data : [];
}

// 3) Create appointment via real backend
// POST /api/appointments/book { doctorId, [patientId], date, time }
export async function createAppointment({ doctorId, patientId, dateISO, time }) {
  const payload = {
    doctorId,
    date: dateISO, // backend expects `date`
    time,
  };

  // let backend default to req.user.id if patientId omitted
  if (patientId) {
    payload.patientId = patientId;
  }

  const { data } = await api.post("/api/appointments/book", payload);
  return data;
}
