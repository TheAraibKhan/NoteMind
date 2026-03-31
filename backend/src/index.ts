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
import { getAIServiceHealth } from "./services/aiService";
import { providerManager } from "./services/providerManager";
import { cachingService } from "./services/cachingService";
import { logger } from "./utils/logger";

dotenv.config();

const app = express();
let dbStatus: "connected" | "degraded" = "degraded";
let server: ReturnType<typeof app.listen> | undefined;
const startTime = Date.now();

// ============================================================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================================================

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

      logger.warn("CORS", `Blocked request from ${origin}`, {
        allowed: configuredOrigins,
      });
      callback(
        new Error(
          `CORS blocked for origin ${origin}. Allowed: ${configuredOrigins.join(", ")}`,
        ),
      );
    },
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Global rate limiting — 1000 requests per 15 minutes per IP
app.use(rateLimitMiddleware(15 * 60 * 1000, 1000, "global"));

// Analytics middleware
app.use(analyticsMiddleware);

// Request ID for tracking
app.use((req, _res, next) => {
  (req as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

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
        logger.info("Database", "MongoDB connected successfully");
        return true;
      } catch (err) {
        logger.error(
          "Database",
          `Connection attempt ${i + 1} failed`,
          err as Error,
        );
        if (i < maxRetries - 1) {
          logger.info("Database", `Retrying in 2s... (${i + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    dbStatus = "degraded";
    logger.warn(
      "Database",
      "MongoDB not available — running in degraded mode",
      {
        uriPresent: !!process.env.MONGODB_URI,
      },
    );
    return false;
  } catch (error) {
    dbStatus = "degraded";
    logger.warn("Database", "Database connection failed", { mode: "degraded" });
    return false;
  }
};

// ============================================================================
// HEALTH & DIAGNOSTICS ENDPOINTS
// ============================================================================

app.get("/api/health", (_req, res) => {
  const uptimeSeconds = Math.round((Date.now() - startTime) / 1000);
  const memUsage = process.memoryUsage();
  const aiHealth = getAIServiceHealth();

  res.json({
    status: dbStatus === "connected" ? "OK" : "DEGRADED",
    uptime: `${uptimeSeconds}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    ai: aiHealth,
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    },
  });
});

// Analytics endpoint
app.get("/api/admin/analytics", (_req, res) => {
  res.json(getAnalytics());
});

// ============================================================================
// ROUTES
// ============================================================================

app.use("/api/auth", authRoutes);
app.use("/api/notes", paginate(10), notesRoutes);
app.use("/api/quiz", paginate(5), quizRoutes);
app.use("/api/progress", paginate(10), progressRoutes);
app.use("/api/flashcards", paginate(10), flashcardRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler — MUST be 4-argument function for Express to recognise it
app.use((err: any, req: any, res: any, _next: any) => {
  const requestId = req.id || "unknown";

  logger.error(
    "GlobalError",
    err.message || "Unhandled error",
    err instanceof Error ? err : undefined,
    {
      path: req.path,
      method: req.method,
      requestId,
    },
  );

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: "Validation error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
      requestId,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
      requestId,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
      requestId,
    });
  }

  if (err.message?.includes("CORS")) {
    return res.status(403).json({
      success: false,
      error: "Cross-origin request blocked",
      requestId,
    });
  }

  // Generic 500 — NEVER expose internal error details in production
  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "An internal error occurred. Please try again.",
    requestId,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
    path: req.path,
  });
});

// ============================================================================
// SERVER START
// ============================================================================

const PORT = process.env.PORT || 5000;

const logStartupBanner = () => {
  const configuredProviders = providerManager.getConfiguredProviderNames();
  const activeProvider = providerManager.getActiveProvider();

  console.log("\n========================================");
  console.log("         NoteMind SaaS API");
  console.log("    Multi-Provider AI Backend");
  console.log("========================================");
  console.log(`  Server:     http://localhost:${PORT}`);
  console.log(`  Env:        ${process.env.NODE_ENV || "development"}`);
  console.log(`  DB:         ${dbStatus}`);
  console.log(`  Providers:  ${configuredProviders.length > 0 ? configuredProviders.join(" → ") : "NONE CONFIGURED"}`);
  console.log(`  Active:     ${activeProvider?.name || "none"}`);
  console.log(`  Groq:       ${process.env.GROQ_API_KEY ? "✓ configured (free)" : "✗ not configured"}`);
  console.log(`  Gemini:     ${process.env.GEMINI_API_KEY ? "✓ configured (free tier)" : "✗ not configured"}`);
  console.log(`  OpenAI:     ${process.env.OPENAI_API_KEY ? "✓ configured (paid)" : "✗ not configured (paid, optional)"}`);
  console.log("========================================\n");

  if (configuredProviders.length === 0) {
    console.warn("⚠️  WARNING: No AI providers configured! Only Wikipedia fallback will work.");
    console.warn("   Set at least one of: GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY\n");
  }


};

const startServer = async () => {
  await connectDB();
  server = app.listen(PORT, logStartupBanner);
};

void startServer();

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Cleanup cache
  cachingService.shutdown();

  if (!server) {
    mongoose.connection.close(false);
    process.exit(0);
    return;
  }

  server.close(() => {
    logger.info("Server", "HTTP server closed");
    mongoose.connection.close(false);
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Server", "Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled rejections — log but don't crash
process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Process", "Unhandled Promise Rejection", reason as Error);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Process", "Uncaught Exception — process will exit", error);
  process.exit(1);
});

export default app;
