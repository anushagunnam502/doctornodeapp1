// controllers.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const m = require("./models");

/* ============== config ============== */
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_EXP = "7d";
const VERIFY_EXP_MIN = 15;      // code valid for 15 minutes
const RESEND_COOLDOWN_SEC = 60; // basic rate-limit for resend

/* ============== helpers ============== */
function sign(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXP });
}

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

function genCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function minutesFromNow(min) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + min);
  return d;
}

/* naive dev-only rate limit for resend */
const resendMap = new Map();
function canResend(email) {
  const now = Math.floor(Date.now() / 1000);
  const last = resendMap.get(email) || 0;
  if (now - last < RESEND_COOLDOWN_SEC) return false;
  resendMap.set(email, now);
  return true;
}

/* ============== AUTH ============== */
const auth = {
  requireAuth,
  requireRole,

  register: async (req, res) => {
    try {
      const { name, email, password, role = "patient" } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ error: "name, email, password required" });
      }

      const exists = await m.users.findByEmail(email);
      if (exists) return res.status(409).json({ error: "User already exists" });

      const hash = await bcrypt.hash(password, 10);
      const id = await m.users.create({ name, email, passwordHash: hash, role });
      const user = await m.users.findById(id);

      const code = genCode6();
      const expiresAt = minutesFromNow(VERIFY_EXP_MIN);
      await m.emailVerifications.createCode(user.id, code, expiresAt);
      console.log(`[verify] code for ${email}: ${code} (expires ${expiresAt.toISOString()})`);

      return res.status(201).json({
        message: "Registered. Please verify your email.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          email_verified: user.email_verified,
        },
      });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  verifyEmail: async (req, res) => {
    try {
      const { email, code } = req.body || {};
      if (!email || !code) return res.status(400).json({ error: "email and code required" });

      const user = await m.users.findByEmail(email);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.email_verified) {
        await m.emailVerifications.deleteForUser(user.id);
        return res.json({ ok: true, message: "Email already verified." });
      }

      const row = await m.emailVerifications.findValid(user.id, code);
      if (!row) return res.status(400).json({ error: "Invalid or expired code" });

      await m.users.markVerified(user.id);
      await m.emailVerifications.deleteForUser(user.id);
      res.json({ ok: true, message: "Email verified. You can now log in." });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  resendVerification: async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: "email required" });

      if (!canResend(email)) {
        return res.status(429).json({ error: "Please wait before requesting another code." });
      }

      const user = await m.users.findByEmail(email);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.email_verified) {
        return res.json({ ok: true, message: "Email already verified." });
      }

      const code = genCode6();
      const expiresAt = minutesFromNow(VERIFY_EXP_MIN);
      await m.emailVerifications.createCode(user.id, code, expiresAt);
      console.log(`[verify:resend] code for ${email}: ${code} (expires ${expiresAt.toISOString()})`);

      res.json({ ok: true, message: "Verification code re-sent." });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const user = await m.users.findByEmail(email);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      if (!user.email_verified) {
        return res.status(409).json({ error: "Email not verified" });
      }

      const token = sign(user);
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          email_verified: user.email_verified,
        },
      });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },
};

/* ============== USERS ============== */
const users = {
  me: async (req, res) => {
    try {
      const user = await m.users.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
        phone: user.phone,
        gender: user.gender,
        dob: user.dob,
      });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  updateMe: async (req, res) => {
    try {
      const { name, phone, gender, dob } = req.body || {};
      await m.users.updateProfile(req.user.id, { name, phone, gender, dob });
      const user = await m.users.findById(req.user.id);
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
        phone: user.phone,
        gender: user.gender,
        dob: user.dob,
      });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },
};

/* ============== DOCTORS ============== */
const doctors = {
  list: async (req, res) => {
    try {
      const { q, city } = req.query;
      const rows = await m.doctors.search({ q, city });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  create: async (req, res) => {
    try {
      const { name, email, phone, specialtyId, city, fee } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ error: "name and email are required" });
      }
      const id = await m.doctors.create({ name, email, phone, specialtyId, city, fee });
      const doc = await m.doctors.findById(id);
      res.status(201).json(doc);
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  detail: async (req, res) => {
    try {
      const doc = await m.doctors.findById(req.params.doctorId);
      if (!doc) return res.status(404).json({ error: "Doctor not found" });
      res.json(doc);
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },
};

/* ============== APPOINTMENTS ============== */

// helper: generate 30-min slots between start..end ("HH:mm")
function generateSlots({ start = "09:00", end = "17:00", stepMin = 30 }) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out = [];
  for (let m = startMin; m <= endMin - stepMin; m += stepMin) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
}

const appointments = {
  // GET /api/slots?doctorId=1&date=YYYY-MM-DD
  slotsForDay: async (req, res) => {
    try {
      const doctorId = Number(req.query.doctorId);
      const dateISO  = String(req.query.date || "");
      if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        return res.status(400).json({ error: "doctorId and date=YYYY-MM-DD are required" });
      }

      const base = generateSlots({ start: "09:00", end: "17:00", stepMin: 30 });
      const lunch = new Set(["12:30", "13:00"]);

      const bookedRows = await m.appointments.listByDoctorAndDate(doctorId, dateISO);
      const booked = new Set(bookedRows.map(r => r.time));

      const today = dayjs().format("YYYY-MM-DD");
      const now   = dayjs().format("HH:mm");

      const list = base.map(t => {
        const isPast   = dateISO === today && t <= now;
        const isLunch  = lunch.has(t);
        const isBooked = booked.has(t);
        const available = !(isPast || isLunch || isBooked);
        const h = Number(t.split(":")[0]);
        const period = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
        const reason = isPast ? "Past time" : isLunch ? "Lunch" : isBooked ? "Booked" : "";
        return { time: t, available, reason, period };
      });

      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  // POST /api/appointments/book
  book: async (req, res) => {
    try {
      const { doctorId, patientId, date, time } = req.body || {};
      const dId      = Number(doctorId);
      const pId      = Number(patientId || req.user?.id);
      const dateISO  = String(date || "");
      const timeHHMM = String(time || "");

      if (!dId || !pId || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO) || !/^\d{2}:\d{2}$/.test(timeHHMM)) {
        return res.status(400).json({ error: "doctorId, date(YYYY-MM-DD), time(HH:MM) required" });
      }

      const doctor = await m.doctors.findById(dId);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });

      const today = dayjs().format("YYYY-MM-DD");
      const now   = dayjs().format("HH:mm");
      if (dateISO < today || (dateISO === today && timeHHMM <= now)) {
        return res.status(400).json({ error: "Cannot book a past time" });
      }

      if (["12:30", "13:00"].includes(timeHHMM)) {
        return res.status(409).json({ error: "That time is not available (lunch)" });
      }

      const conflict = await m.appointments.findConflict(dId, dateISO, timeHHMM);
      if (conflict) {
        return res.status(409).json({ error: "That time is already booked" });
      }

      const id = await m.appointments.create({
        doctorId: dId,
        patientId: pId,
        date: dateISO,
        time: timeHHMM,
        status: "booked",
      });

      const saved = await m.appointments.findById(id);
      res.status(201).json(saved);
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  // GET /api/appointments/mine
  listMine: async (req, res) => {
    try {
      const rows = await m.appointments.listByPatient(req.user.id);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

    // POST /api/appointments/:id/cancel
  cancel: async (req, res) => {
    try {
      const id = Number(req.params.id || 0);
      if (!id) {
        return res.status(400).json({ error: "Appointment id required" });
      }

      const appt = await m.appointments.findById(id);
      if (!appt) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Only the patient who owns it (or admin) can cancel
      const userId = req.user?.id;
      const role   = req.user?.role;

      if (role !== "admin" && Number(appt.patientId) !== Number(userId)) {
        return res.status(403).json({ error: "You cannot cancel this appointment" });
      }

      if (appt.status && appt.status.toLowerCase() === "cancelled") {
        // idempotent behavior
        return res.json({ ok: true, message: "Already cancelled", appointment: appt });
      }

      await m.appointments.updateStatus(id, "cancelled");
      const updated = await m.appointments.findById(id);

      return res.json({
        ok: true,
        message: "Appointment cancelled",
        appointment: updated,
      });
    } catch (e) {
      console.error("cancel error", e);
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },

  // POST /api/appointments/:id/reschedule
  // body: { date: "YYYY-MM-DD", time: "HH:MM" }
  reschedule: async (req, res) => {
    try {
      const id = Number(req.params.id || 0);
      if (!id) {
        return res.status(400).json({ error: "Appointment id required" });
      }

      const existing = await m.appointments.findById(id);
      if (!existing) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Only owning patient (or admin) can reschedule
      const userId = req.user?.id;
      const role   = req.user?.role;

      if (role !== "admin" && Number(existing.patientId) !== Number(userId)) {
        return res.status(403).json({ error: "You cannot reschedule this appointment" });
      }

      const { date, time } = req.body || {};
      const dateISO  = String(date || "");
      const timeHHMM = String(time || "");

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO) || !/^\d{2}:\d{2}$/.test(timeHHMM)) {
        return res.status(400).json({ error: "date(YYYY-MM-DD) and time(HH:MM) required" });
      }

      // Past / lunch / conflict checks (reuse same rules as booking)
      const today = dayjs().format("YYYY-MM-DD");
      const now   = dayjs().format("HH:mm");

      if (dateISO < today || (dateISO === today && timeHHMM <= now)) {
        return res.status(400).json({ error: "Cannot reschedule to a past time" });
      }

      if (["12:30", "13:00"].includes(timeHHMM)) {
        return res.status(409).json({ error: "That time is not available (lunch)" });
      }

      // Check conflict for same doctor at new slot
      const conflict = await m.appointments.findConflict(
        existing.doctorId,
        dateISO,
        timeHHMM
      );
      // conflict.id === existing.id is ok (same record)
      if (conflict && Number(conflict.id) !== Number(id)) {
        return res.status(409).json({ error: "That time is already booked" });
      }

      await m.appointments.updateDateTime(id, {
        date: dateISO,
        time: timeHHMM,
        status: "booked",
      });

      const updated = await m.appointments.findById(id);
      return res.json({
        ok: true,
        message: "Appointment rescheduled",
        appointment: updated,
      });
    } catch (e) {
      console.error("reschedule error", e);
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  },


};


/* ============== EXPORT ============== */
module.exports = { auth, users, doctors, appointments };
