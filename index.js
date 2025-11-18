// C:\doctornodeapp\index.js

// 1) Load env
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });

// 2) Core deps
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// 3) App + config
const app = express();
const PORT = Number(process.env.PORT || 5000);

// 4) CORS
const allowed = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowed.has(origin) || !origin) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

// 5) Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// 6) Mount routes (NO try/catch, and log the resolved file)
const router = require("./routes");
console.log(">>> ROUTER MODULE RESOLVED FROM:", require.resolve("./routes"));
app.use(router);

// 7) Health
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// 8) Debug: show all registered routes
app.get("/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());
      routes.push({ methods, path: layer.route.path });
    }
  });
  res.json(routes);
});

// 9) 404 + error handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error("[API ERROR]", err);
  res.status(500).json({ error: "Server error" });
});

// 10) Start
app.listen(PORT, () => {
  console.log(`API running on http://127.0.0.1:${PORT}`);
});
