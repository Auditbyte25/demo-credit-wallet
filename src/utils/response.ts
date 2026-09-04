import { Response } from "express";

interface SuccessResponseBody<T> {
  success: true;
  message: string;
  data?: T;
}

/**
 * Sends a consistent success response shape across all controllers.
 */
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): void => {
  const body: SuccessResponseBody<T> = {
    success: true,
    message,
  };

  if (data !== undefined) {
    body.data = data;
  }

  res.status(statusCode).json(body);
};