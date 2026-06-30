import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "250kb" }));
app.use(express.urlencoded({ extended: true, limit: "250kb" }));

// Routes
app.use("/api", apiRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", mode: "Phase 1 — Mock Data" });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);

    if (err.message?.includes("We support pasted text")) {
      res.status(400).json({
        error: "Unsupported file type",
        message: err.message,
      });
      return;
    }

    res.status(500).json({
      error: "Internal error",
      message: "Something went wrong. Please try again.",
    });
  }
);

app.listen(PORT, () => {
  console.log(`\n🔒 Conseal Trust Console — Backend`);
  console.log(`   Mode: Phase 1 (Mock Data)`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Ready at: http://localhost:${PORT}\n`);
});
