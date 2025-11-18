// C:\doctornodeapp\routes.js
const express = require("express");
const ctrl = require("./controllers");

const router = express.Router();

console.log(">>> USING ROUTES FILE:", __filename);
console.log("routes loaded");

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
router.post("/api/doctors",          ctrl.auth.requireAuth, ctrl.doctors.create);
router.get("/api/doctors/:doctorId", ctrl.auth.requireAuth, ctrl.doctors.detail);

/* ========= APPOINTMENTS & SLOTS ========= */
router.get ("/api/slots",             ctrl.auth.requireAuth, ctrl.appointments.slotsForDay);
router.post("/api/appointments/book", ctrl.auth.requireAuth, ctrl.appointments.book);
router.get ("/api/appointments/mine", ctrl.auth.requireAuth, ctrl.appointments.listMine);

console.log("routes loaded (appointments + slots)");

module.exports = router;
