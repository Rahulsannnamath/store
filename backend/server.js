const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config({ quiet: true });

const { pool, initDB } = require("./utils/db");

const authRoutes = require("./routes/auth.routes");
const storeRoutes = require("./routes/store.routes");
const ownerRoutes = require("./routes/owner.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: "16kb" }));


app.get("/", (req, res) => res.send("server is up"));


app.use("/api/auth", authRoutes);
app.use("/api", storeRoutes);         
app.use("/api/owner", ownerRoutes);   
app.use("/api/admin", adminRoutes);   


app.use((req, res) => res.status(404).json({ message: 'not found' }));
app.use((err, req, res, next) => {

  if (res.headersSent) return next(err);
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email or record already exists' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request too large' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'Invalid reference' });
  res.status(500).json({ message: "server error" });
});

if (require.main === module) (async () => {
  try {
    await initDB();
    app.locals.db = pool; 
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`server at ${port}`));
  } catch (e) {
    console.error("Database startup failed:", e.code || "configuration or connection error");
    process.exit(1);
  }
})();


module.exports = app;
