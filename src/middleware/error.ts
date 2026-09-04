import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/applicationError";

interface MysqlError extends Error {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

const errorMiddleware = (
  err: AppError | MysqlError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || "Internal server error";

  const mysqlErr = err as MysqlError;

  // Duplicate entry (unique constraint violation) — e.g. email/phone already taken
  if (mysqlErr.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message = "A record with these details already exists";
  }

  // Foreign key constraint failure — referencing a row that doesn't exist
  if (mysqlErr.code === "ER_NO_REFERENCED_ROW_2" || mysqlErr.code === "ER_NO_REFERENCED_ROW") {
    statusCode = 400;
    message = "Referenced resource does not exist";
  }

  // Invalid JWT signature/format
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  // Expired JWT
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;