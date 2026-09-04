import { Response, NextFunction } from "express";
import accountService from "../services/accountService";
import { sendSuccess } from "../utils/response";
import { AuthRequest } from "../types/express";
import { BadRequestError } from "../errors/applicationError";

export class AccountController {
  static async createAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { currency } = req.body as { currency?: string };
      const account = await accountService.createAccount(
        req.user!.userId,
        currency
      );
      sendSuccess(res, "Account created successfully", { account }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getUserAccounts(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const accounts = await accountService.getUserAccounts(req.user!.userId);
      sendSuccess(res, "Accounts retrieved successfully", { accounts });
    } catch (err) {
      next(err);
    }
  }

  static async getAccountBalance(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const accountId = Number(req.params.accountId);

      if (!Number.isInteger(accountId)) {
        throw new BadRequestError("accountId must be a valid number");
      }

      const balance = await accountService.getAccountBalance(
        accountId,
        req.user!.userId
      );
      sendSuccess(res, "Balance retrieved successfully", balance);
    } catch (err) {
      next(err);
    }
  }
}

export default AccountController;