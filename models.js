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
    namedPlaceholders: true
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
  }
};

/* ============ EMAIL VERIFICATIONS (ONE-TIME CODES) ============ */
exports.emailVerifications = {
  // Remove any existing codes for this user
  async deleteForUser(userId) {
    const pool = await poolPromise;
    await pool.execute("DELETE FROM email_verifications WHERE user_id = ?", [userId]);
  },

  // Create a new code row; expiresAt is a JS Date
  async createCode(userId, code, expiresAt) {
    const pool = await poolPromise;
    // ensure only one active code per user
    await this.deleteForUser(userId);
    await pool.execute(
      "INSERT INTO email_verifications (user_id, code, expires_at) VALUES (?, ?, ?)",
      [userId, code, expiresAt]
    );
  },

  // Find a still-valid code
  async findValid(userId, code) {
    const pool = await poolPromise;
    const [rows] = await pool.execute(
      "SELECT id, user_id, code, expires_at FROM email_verifications WHERE user_id = ? AND code = ? AND expires_at > NOW() LIMIT 1",
      [userId, code]
    );
    return rows[0];
  }
};

/* ===================== DOCTORS ===================== */
exports.doctors = {
  async search({ q, city }) {
    const pool = await poolPromise;
    const likeQ = q ? "%" + q + "%" : "%";
    const likeC = city ? "%" + city + "%" : "%";
    const sql =
      "SELECT d.id, d.name, d.email, d.phone, d.city, d.fee," +
      "       s.id AS specialtyId, s.name AS specialty " +
      "FROM doctors d " +
      "LEFT JOIN specialties s ON s.id = d.specialty_id " +
      "WHERE (d.name LIKE ? OR s.name LIKE ?) " +
      "  AND d.city LIKE ? " +
      "ORDER BY d.name ASC";
    const [r] = await pool.execute(sql, [likeQ, likeQ, likeC]);
    return r;
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
    const [r] = await pool.execute(sql, [id]);
    return r[0];
  }
};
