import { Request, Response, NextFunction } from "express";
import authService from "../services/authService";
import userRepository from "../repositories/userRepository";
import { sendSuccess } from "../utils/response";
import { SignupDTO, LoginDTO } from "../types/authTypes";
import { AuthRequest } from "../types/express";
import { NotFoundError } from "../errors/applicationError";

export class AuthController {
  static async signup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.signup(req.body as SignupDTO);
      sendSuccess(res, "Account created successfully", result, 201);
    } catch (err) {
      next(err);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.login(req.body as LoginDTO);
      sendSuccess(res, "Login successful", result);
    } catch (err) {
      next(err);
    }
  }

  static async logout(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.logout();
      sendSuccess(res, result.message);
    } catch (err) {
      next(err);
    }
  }

  static async me(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await userRepository.findById(req.user!.userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      sendSuccess(res, "User profile retrieved", userRepository.sanitize(user));
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;