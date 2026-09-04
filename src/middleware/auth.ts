import { Response, NextFunction } from "express";
import { JWT } from "../utils/jwt";
import { UnauthorizedError } from "../errors/applicationError";
import { AuthRequest } from "../types/express";
import catchAsyncErrors from "./catchAsyncErrors";

/**
 * Verifies the Authorization: Bearer <token> header and attaches the
 * decoded payload to req.user. Faux token auth — a single signed JWT,
 * no refresh flow, no server-side session store to check against.
 */
export const authenticate = catchAsyncErrors(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new UnauthorizedError("Please login to continue"));
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = JWT.verifyToken(token);
      req.user = decoded;
      next();
    } catch (err) {
      return next(new UnauthorizedError("Invalid or expired token"));
    }
  }
);