const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { pool, initDB } = require("./utils/db");

const authRoutes = require("./routes/auth.routes");
const storeRoutes = require("./routes/store.routes");
const ownerRoutes = require("./routes/owner.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Health
app.get("/", (req, res) => res.send("server is up"));

// Mount routes (paths remain identical to your current API)
app.use("/api/auth", authRoutes);
app.use("/api", storeRoutes);         // /getstores, /stores/:storeId/ratings
app.use("/api/owner", ownerRoutes);   // /stores, /stores/:storeId/raters
app.use("/api/admin", adminRoutes);   // /stats, /users, /stores, etc.

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "server error" });
});

(async () => {
  try {
    await initDB();
    app.locals.db = pool; // keep for compatibility
    const port = process.env.PORT || 8080;
    app.listen(port, () => console.log(`server at ${port}`));
  } catch (e) {
    console.error("db connection failed", e);
    process.exit(1);
  }
})();

