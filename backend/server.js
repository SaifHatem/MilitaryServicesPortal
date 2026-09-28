require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");

const serviceRoutes = require("./routes/serviceRoutes");
const requirementRoutes = require("./routes/requirementRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

const PORT = process.env.PORT || 5000;

app.use(express.json());

connectDB();

app.use("/api/services", serviceRoutes);
app.use("/api/requirements", requirementRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("بوابة الخدمات الإلكترونية تعمل بنجاح");
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
