import { Request, Response, NextFunction } from "express";

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
}

export function paginate(defaultLimit: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || defaultLimit),
    );

    const skip = (page - 1) * limit;

    (req as any).pagination = { page, limit, skip };
    next();
  };
}

// Input validation utilities
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().substring(0, 1000);
};
