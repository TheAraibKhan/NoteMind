import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth";
import notesRoutes from "./routes/notes";
import quizRoutes from "./routes/quiz";
import progressRoutes from "./routes/progress";
import flashcardRoutes from "./routes/flashcards";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { paginate } from "./middleware/validation";
import { analyticsMiddleware, getAnalytics } from "./middleware/analytics";

dotenv.config();

const app = express();
let dbStatus: "connected" | "degraded" = "degraded";
let server: ReturnType<typeof app.listen> | undefined;

// Security & Performance Middleware
app.use(helmet());

const normalizeOrigin = (value: string): string => value.replace(/\/$/, "");
const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (configuredOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `CORS blocked for origin ${origin}. Allowed: ${configuredOrigins.join(
            ", ",
          )}`,
        ),
      );
    },
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate Limiting - 100 requests per 15 minutes per IP
app.use(rateLimitMiddleware(15 * 60 * 1000, 100));

// Analytics Middleware
app.use(analyticsMiddleware);

// Request ID for tracking
app.use((req, res, next) => {
  (req as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// Database Connection with Retry Logic (Optional for Development)
const connectDB = async (): Promise<boolean> => {
  try {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await mongoose.connect(
          process.env.MONGODB_URI || "mongodb://localhost:27017/notemind",
          {
            serverSelectionTimeoutMS: 5000,
          },
        );
        dbStatus = "connected";
        console.log("MongoDB connected");
        return true;
      } catch (err) {
        if (i < maxRetries - 1) {
          console.log(`Retry ${i + 1}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    dbStatus = "degraded";
    console.log("MongoDB not available - API running in degraded mode");
    return false;
  } catch (error) {
    dbStatus = "degraded";
    console.log("Database optional for development mode");
    return false;
  }
};

// Health Check & System Status
app.get("/api/health", (req, res) => {
  res.json({
    status: dbStatus === "connected" ? "OK" : "DEGRADED",
    uptime: process.uptime(),
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    database: dbStatus,
  });
});

// Analytics Endpoint (Admin only - should add auth in production)
app.get("/api/admin/analytics", (req, res) => {
  // In production, verify admin token here
  res.json(getAnalytics());
});

// Routes with Pagination
app.use("/api/auth", authRoutes);
app.use("/api/notes", paginate(10), notesRoutes);
app.use("/api/quiz", paginate(5), quizRoutes);
app.use("/api/progress", paginate(10), progressRoutes);
app.use("/api/flashcards", paginate(10), flashcardRoutes);

// Error Handling Middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`[${req.id}] Error:`, err.message);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.message,
      requestId: req.id,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "Invalid ID format",
      requestId: req.id,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
      requestId: req.id,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    requestId: req.id,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
  });
});

const PORT = process.env.PORT || 5000;

const logStartupBanner = () => {
  console.log("\n========================================");
  console.log("         NoteMind SaaS API");
  console.log("========================================");
  console.log(`  Server:  http://localhost:${PORT}`);
  console.log(`  Env:     ${process.env.NODE_ENV || "development"}`);
  console.log(`  DB:      ${dbStatus}`);
  console.log("========================================\n");
};

const startServer = async () => {
  await connectDB();
  server = app.listen(PORT, logStartupBanner);
};

void startServer();

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");

  if (!server) {
    mongoose.connection.close(false);
    process.exit(0);
    return;
  }

  server.close(() => {
    mongoose.connection.close(false);
    process.exit(0);
  });
});

export default app;
