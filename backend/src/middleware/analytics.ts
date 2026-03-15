import { Request, Response, NextFunction } from "express";

export interface ActivityLog {
  userId?: string;
  action: string;
  endpoint: string;
  statusCode: number;
  timestamp: Date;
  duration: number;
  ipAddress: string;
}

const activityLogs: ActivityLog[] = [];

export function analyticsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Capture response finish
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const log: ActivityLog = {
      userId: (req as any).userId,
      action: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      timestamp: new Date(),
      duration,
      ipAddress: req.ip || "unknown",
    };

    activityLogs.push(log);

    // Keep last 10000 logs in memory
    if (activityLogs.length > 10000) {
      activityLogs.shift();
    }
  });

  next();
}

export function getAnalytics() {
  return {
    totalRequests: activityLogs.length,
    averageResponseTime: activityLogs.reduce((a, b) => a + b.duration, 0) / activityLogs.length || 0,
    requestsByEndpoint: activityLogs.reduce(
      (acc, log) => {
        acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    recentLogs: activityLogs.slice(-100),
  };
}

export function getActivityLogs() {
  return activityLogs;
}
