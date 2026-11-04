
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to CodePulse Backend!");
});

// Health-check API
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CodePulse API is running",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`CodePulse server running at http://localhost:${PORT}`);
});
