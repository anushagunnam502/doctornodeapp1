// routes.js
const express = require("express");
const ctrl = require("./controllers");

console.log("routes loaded");
const router = express.Router();

/* ========= AUTH ========= */
router.post("/api/auth/register", ctrl.auth.register);
router.post("/api/auth/login",    ctrl.auth.login);

/* email verification */
router.post("/api/auth/verify-email",        ctrl.auth.verifyEmail);
router.post("/api/auth/resend-verification", ctrl.auth.resendVerification);

/* ========= USERS ========= */
router.get("/api/users/me", ctrl.auth.requireAuth, ctrl.users.me);
router.put("/api/users/me", ctrl.auth.requireAuth, ctrl.users.updateMe);

/* ========= DOCTORS ========= */
router.get("/api/doctors",           ctrl.auth.requireAuth, ctrl.doctors.list);
router.post("/api/doctors",          ctrl.auth.requireAuth, /* ctrl.auth.requireRole('admin'), */ ctrl.doctors.create);
router.get("/api/doctors/:doctorId", ctrl.auth.requireAuth, ctrl.doctors.detail);

module.exports = router;
