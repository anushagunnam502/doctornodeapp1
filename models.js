// models.js
const mysql = require("mysql2/promise");

async function getPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "doctorapp",
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
}

const poolPromise = getPool();

/* ===================== USERS ===================== */
exports.users = {
  async findByEmail(email) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, phone, gender, dob, password_hash, email_verified FROM users WHERE email = ?",
      [email]
    );
    return rows[0];
  },

  async findById(id) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, phone, gender, dob, password_hash, email_verified FROM users WHERE id = ?",
      [id]
    );
    return rows[0];
  },

  async create({ name, email, passwordHash, role }) {
    const pool = await poolPromise;
    const [res] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, role]
    );
    return res.insertId;
  },

  async updateProfile(id, { name, phone, gender, dob }) {
    const pool = await poolPromise;
    await pool.execute(
      "UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), gender = COALESCE(?, gender), dob = COALESCE(?, dob) WHERE id = ?",
      [name ?? null, phone ?? null, gender ?? null, dob ?? null, id]
    );
  },

  async markVerified(id) {
    const pool = await poolPromise;
    await pool.execute("UPDATE users SET email_verified = 1 WHERE id = ?", [id]);
  },
};

/* ============ EMAIL VERIFICATIONS (ONE-TIME CODES) ============ */
exports.emailVerifications = {
  async deleteForUser(userId) {
    const pool = await poolPromise;
    await pool.execute("DELETE FROM email_verifications WHERE user_id = ?", [userId]);
  },

  async createCode(userId, code, expiresAt) {
    const pool = await poolPromise;
    await this.deleteForUser(userId);
    await pool.execute(
      "INSERT INTO email_verifications (user_id, code, expires_at) VALUES (?, ?, ?)",
      [userId, code, expiresAt]
    );
  },

  async findValid(userId, code) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      "SELECT id, user_id, code, expires_at FROM email_verifications WHERE user_id = ? AND code = ? AND expires_at > NOW() LIMIT 1",
      [userId, code]
    );
    return rows[0];
  },
};

/* ===================== DOCTORS ===================== */
exports.doctors = {
  async search({ q, city }) {
    const pool = await poolPromise;
    const likeQ = q ? `%${q}%` : "%";
    const likeC = city ? `%${city}%` : "%";

    const sql =
      "SELECT d.id, d.name, d.email, d.phone, d.city, d.fee," +
      "       s.id AS specialtyId, s.name AS specialty " +
      "FROM doctors d " +
      "LEFT JOIN specialties s ON s.id = d.specialty_id " +
      "WHERE (d.name LIKE ? OR s.name LIKE ?) " +
      "  AND d.city LIKE ? " +
      "ORDER BY d.name ASC";

    const [rows] = await pool.execute(sql, [likeQ, likeQ, likeC]);
    return rows;
  },

  async create({ name, email, phone, specialtyId, city, fee }) {
    const pool = await poolPromise;
    const [res] = await pool.execute(
      "INSERT INTO doctors (name, email, phone, specialty_id, city, fee) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, phone || null, specialtyId || null, city || null, fee || null]
    );
    return res.insertId;
  },

  async findById(id) {
    const pool = await poolPromise;
    const sql =
      "SELECT d.id, d.name, d.email, d.phone, d.city, d.fee," +
      "       s.id AS specialtyId, s.name AS specialty " +
      "FROM doctors d " +
      "LEFT JOIN specialties s ON s.id = d.specialty_id " +
      "WHERE d.id = ?";
    const [rows] = await pool.execute(sql, [id]);
    return rows[0];
  },
};

/* ===================== APPOINTMENTS ===================== */
exports.appointments = {
  // Create a new appointment
  async create({ doctorId, patientId, date, time, status = "booked" }) {
    const pool = await poolPromise;
    const [res] = await pool.execute(
      "INSERT INTO appointments (doctor_id, patient_id, date, time, status) VALUES (?, ?, ?, ?, ?)",
      [doctorId, patientId, date, time, status]
    );
    return res.insertId;
  },

  async findById(id) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      `SELECT a.id,
              a.doctor_id  AS doctorId,
              a.patient_id AS patientId,
              DATE_FORMAT(a.date,'%Y-%m-%d') AS date,
              a.time,
              a.status,
              d.name AS doctorName,
              d.city,
              d.fee
         FROM appointments a
         LEFT JOIN doctors d ON d.id = a.doctor_id
        WHERE a.id = ?`,
      [id]
    );
    return rows[0];
  },

  // All appointments for a patient (for /api/appointments/mine)
  async listByPatient(patientId) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      `SELECT a.id,
              a.doctor_id  AS doctorId,
              a.patient_id AS patientId,
              DATE_FORMAT(a.date,'%Y-%m-%d') AS date,
              a.time,
              a.status,
              d.name AS doctorName,
              d.city,
              d.fee
         FROM appointments a
         LEFT JOIN doctors d ON d.id = a.doctor_id
        WHERE a.patient_id = ?
        ORDER BY a.date ASC, a.time ASC`,
      [patientId]
    );
    return rows;
  },

  // Existing bookings for a doctor on a given date (for slot calc)
  async listByDoctorAndDate(doctorId, dateISO) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      `SELECT id, time, status
         FROM appointments
        WHERE doctor_id = ?
          AND date = ?
          AND status IN ('booked','confirmed')`,
      [doctorId, dateISO]
    );
    return rows;
  },

  // Return a conflicting appointment if any
  async findConflict(doctorId, dateISO, time) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      `SELECT id
         FROM appointments
        WHERE doctor_id = ?
          AND date = ?
          AND time = ?
          AND status IN ('booked','confirmed')
        LIMIT 1`,
      [doctorId, dateISO, time]
    );
    return rows[0];
  },

  // Update status (e.g., cancel)
  async updateStatus(id, status) {
    const pool = await poolPromise;
    await pool.execute(
      "UPDATE appointments SET status = ? WHERE id = ?",
      [status, id]
    );
  },

  // Update date/time (and optionally status) for reschedule
  async updateDateTime(id, { date, time, status }) {
    const pool = await poolPromise;
    if (status) {
      await pool.execute(
        "UPDATE appointments SET date = ?, time = ?, status = ? WHERE id = ?",
        [date, time, status, id]
      );
    } else {
      await pool.execute(
        "UPDATE appointments SET date = ?, time = ? WHERE id = ?",
        [date, time, id]
      );
    }
  },
};
