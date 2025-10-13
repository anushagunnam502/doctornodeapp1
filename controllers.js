// controllers.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const m = require("./models");

/* ============== config ============== */
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_EXP = "7d";
const VERIFY_EXP_MIN = 15;     // code valid for 15 minutes
const RESEND_COOLDOWN_SEC = 60; // basic rate-limit per email (memory only, dev)

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
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

function genCode6() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

function minutesFromNow(min) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + min);
  return d;
}

/* naive dev-only rate limit for resend */
const resendMap = new Map(); // email -> lastEpochSec
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
      const user = await m.users.findById(id); // email_verified defaults to 0

      // create verification code
      const code = genCode6();
      const expiresAt = minutesFromNow(VERIFY_EXP_MIN);
      await m.emailVerifications.createCode(user.id, code, expiresAt);

      // DEV: log the code to server console instead of sending email
      console.log(`[verify] code for ${email}: ${code} (expires ${expiresAt.toISOString()})`);

      return res.status(201).json({
        message: "Registered. Please verify your email with the 6-digit code.",
        user: { id: user.id, name: user.name, email: user.email, role: user.role, email_verified: user.email_verified }
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
        // already verified
        await m.emailVerifications.deleteForUser(user.id);
        return res.json({ ok: true, message: "Email already verified." });
      }

      const row = await m.emailVerifications.findValid(user.id, code);
      if (!row) return res.status(400).json({ error: "Invalid or expired code" });

      await m.users.markVerified(user.id);
      await m.emailVerifications.deleteForUser(user.id);
      return res.json({ ok: true, message: "Email verified. You can now log in." });
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
      if (user.email_verified) return res.status(200).json({ ok: true, message: "Email already verified." });

      const code = genCode6();
      const expiresAt = minutesFromNow(VERIFY_EXP_MIN);
      await m.emailVerifications.createCode(user.id, code, expiresAt);

      // DEV: log the code instead of sending an email
      console.log(`[verify:resend] code for ${email}: ${code} (expires ${expiresAt.toISOString()})`);

      return res.json({ ok: true, message: "Verification code re-sent (check server console in dev)." });
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
        user: { id: user.id, name: user.name, email: user.email, role: user.role, email_verified: user.email_verified }
      });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  }
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
        dob: user.dob
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
        dob: user.dob
      });
    } catch (e) {
      res.status(500).json({ error: "Server error", detail: e.message });
    }
  }
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
  }
};

module.exports = { auth, users, doctors };
