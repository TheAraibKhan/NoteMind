/**
 * Production-grade logging utility for NoteMind backend
 *
 * Features:
 * - Structured JSON logging with correlation IDs
 * - Log levels: DEBUG, INFO, WARN, ERROR
 * - Request context tracking
 * - Performance timing helpers
 * - Safe serialisation (no circular reference crashes)
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  correlationId?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  durationMs?: number;
}

// Configurable minimum log level
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
    const envLevel = (process.env.LOG_LEVEL || "").toUpperCase() as LogLevel;
    this.minLevel =
      envLevel && envLevel in LOG_LEVEL_PRIORITY
        ? envLevel
        : this.isDevelopment
          ? LogLevel.DEBUG
          : LogLevel.INFO;
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  debug(
    service: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.DEBUG, service, message, data);
  }

  info(service: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, service, message, data);
  }

  warn(service: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, service, message, data);
  }

  error(
    service: string,
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>,
  ): void {
    const entry = this.formatLog(LogLevel.ERROR, service, message, data);

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    } else if (error !== undefined) {
      entry.error = {
        name: "UnknownError",
        message: String(error),
      };
    }

    this.output(entry);
  }

  /**
   * Create a timer for measuring operation duration.
   * Usage:
   *   const timer = logger.startTimer("AIService", "Gemini call");
   *   // ... do work ...
   *   timer.done({ tokens: 150 });
   */
  startTimer(
    service: string,
    operation: string,
  ): { done: (data?: Record<string, unknown>) => void } {
    const start = performance.now();
    return {
      done: (data?: Record<string, unknown>) => {
        const durationMs = Math.round(performance.now() - start);
        this.log(LogLevel.INFO, service, `${operation} completed`, {
          ...data,
          durationMs,
        });
      },
    };
  }

  // -------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------

  private log(
    level: LogLevel,
    service: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }
    this.output(this.formatLog(level, service, message, data));
  }

  private formatLog(
    level: LogLevel,
    service: string,
    message: string,
    data?: Record<string, unknown>,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      data:
        data && Object.keys(data).length > 0
          ? this.safeSerialise(data)
          : undefined,
    };
  }

  private output(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Human-readable format in development
      const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.service}]`;
      const msg = `${prefix} ${entry.message}`;

      switch (entry.level) {
        case LogLevel.DEBUG:
          console.log(msg, entry.data ?? "");
          break;
        case LogLevel.INFO:
          console.log(msg, entry.data ?? "");
          break;
        case LogLevel.WARN:
          console.warn(msg, entry.data ?? "");
          break;
        case LogLevel.ERROR:
          console.error(msg, entry.data ?? "", entry.error ?? "");
          break;
      }
    } else {
      // Structured JSON in production (easy to parse with log aggregators)
      const line = JSON.stringify(entry);
      if (entry.level === LogLevel.ERROR) {
        console.error(line);
      } else if (entry.level === LogLevel.WARN) {
        console.warn(line);
      } else {
        console.log(line);
      }
    }
  }

  /**
   * Safely serialise data, preventing circular reference errors
   * and truncating excessively long string values.
   */
  private safeSerialise(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    try {
      const seen = new WeakSet();
      const cleaned = JSON.parse(
        JSON.stringify(data, (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return "[Circular]";
            seen.add(value);
          }
          if (typeof value === "string" && value.length > 500) {
            return value.slice(0, 500) + "...[truncated]";
          }
          return value;
        }),
      );
      return cleaned;
    } catch {
      return { _serialisationError: "Failed to serialise log data" };
    }
  }
}

export const logger = new Logger();
