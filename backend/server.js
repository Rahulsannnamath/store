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


app.get("/", (req, res) => res.send("server is up"));


app.use("/api/auth", authRoutes);
app.use("/api", storeRoutes);         
app.use("/api/owner", ownerRoutes);   
app.use("/api/admin", adminRoutes);   


app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "server error" });
});

(async () => {
  try {
    await initDB();
    app.locals.db = pool; 
    const port = process.env.PORT || 8080;
    app.listen(port, () => console.log(`server at ${port}`));
  } catch (e) {
    console.error("db connection failed", e);
    process.exit(1);
  }
})();

