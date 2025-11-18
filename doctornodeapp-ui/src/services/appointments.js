// src/services/appointments.js
import client from "../api/client";

// GET /api/appointments/mine
export async function getMyAppointments(token) {
  if (!token) {
    throw new Error("You must be logged in to see your appointments.");
  }

  const response = await client.get("/api/appointments/mine", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data; // backend returns an array
}
