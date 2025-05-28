const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend")));

// Error handling for large file uploads
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "File too large. Maximum file size is 1GB." });
  }
  next(err);
});

// API routes
app.use("/api", routes);

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
  console.log(`API endpoint at http://localhost:${PORT}/api/transcribe`);
});
