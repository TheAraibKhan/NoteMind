/**
 * AI Service Diagnostics
 *
 * Provides health checks and status monitoring for Groq and Wikipedia APIs
 */

import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { getHybridServiceStatus } from "@/services/hybridAiService";

export interface DiagnosticReport {
  timestamp: string;
  status: "healthy" | "degraded" | "offline";
  apis: {
    groq: {
      available: boolean;
      configured: boolean;
      circuitBreakerStatus?: string;
    };
    wikipedia: {
      available: boolean;
      configured: boolean;
      reachable?: boolean;
    };
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  hybridMode: {
    enabled: boolean;
    prioritizeQuality: boolean;
  };
  performance: {
    timeouts: {
      groq: number;
      wikipedia: number;
      hybrid: number;
    };
  };
}

export async function getAIServiceDiagnostics(): Promise<DiagnosticReport> {
  const hybridStatus = getHybridServiceStatus();

  // Determine overall status
  let status: "healthy" | "degraded" | "offline" = "healthy";
  if (!hybridStatus.groqAvailable && !hybridStatus.wikipediaAvailable) {
    status = "offline";
  } else if (
    !hybridStatus.groqAvailable ||
    !hybridStatus.wikipediaAvailable
  ) {
    status = "degraded";
  }

  return {
    timestamp: new Date().toISOString(),
    status,
    apis: {
      groq: {
        available: hybridStatus.groqAvailable,
        configured: !!process.env.GROQ_API_KEY,
      },
      wikipedia: {
        available: hybridStatus.wikipediaAvailable,
        configured: !!process.env.FREE_NOTES_API_URL,
      },
    },
    cache: {
      enabled: hybridStatus.cacheEnabled,
      ttl: parseInt(process.env.CACHE_TTL_SECONDS || "86400"),
    },
    hybridMode: {
      enabled: hybridStatus.hybridModeEnabled,
      prioritizeQuality: process.env.PRIORITIZE_QUALITY === "true",
    },
    performance: {
      timeouts: hybridStatus.timeouts,
    },
  };
}

/**
 * Express middleware for AI service health check
 */
export async function aiServiceHealthCheck(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const diagnostics = await getAIServiceDiagnostics();

    const httpStatus =
      diagnostics.status === "healthy"
        ? 200
        : diagnostics.status === "degraded"
          ? 202
          : 503;

    res.status(httpStatus).json({
      health: {
        status: diagnostics.status,
        timestamp: diagnostics.timestamp,
      },
      diagnostics,
    });

    logger.debug("Health", "AI service diagnostics reported", {
      status: diagnostics.status,
    });
  } catch (error) {
    logger.error("Health", "Failed to generate diagnostics", error as Error);
    res.status(500).json({
      health: { status: "error", timestamp: new Date().toISOString() },
      error: "Failed to retrieve diagnostics",
    });
  }
}
