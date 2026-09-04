import { Response, NextFunction } from "express";
import transactionService, {
  TransactionService,
} from "../services/transactionService";
import {
  BadRequestError,
  UnauthorizedError,
} from "../errors/applicationError";
import { AuthRequest } from "../types/express";

export class TransactionController {
  constructor(
    private readonly transactionSvc: TransactionService = transactionService
  ) {
    this.fundAccount = this.fundAccount.bind(this);
    this.transferFunds = this.transferFunds.bind(this);
    this.withdrawFunds = this.withdrawFunds.bind(this);
  }

  /**
   * Fund an account
   */
  async fundAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError();
      }

      const { accountId, amount, idempotencyKey } = req.body;

      if (
        accountId === undefined ||
        amount === undefined ||
        !idempotencyKey
      ) {
        throw new BadRequestError(
          "accountId, amount and idempotencyKey are required"
        );
      }

      const transaction = await this.transactionSvc.fundAccount({
        accountId: Number(accountId),
        amount: Number(amount),
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        message: "Account funded successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transfer funds between accounts
   */
  async transferFunds(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError();
      }

      const {
        fromAccountId,
        toAccountId,
        amount,
        idempotencyKey,
      } = req.body;

      if (
        fromAccountId === undefined ||
        toAccountId === undefined ||
        amount === undefined ||
        !idempotencyKey
      ) {
        throw new BadRequestError(
          "fromAccountId, toAccountId, amount and idempotencyKey are required"
        );
      }

      const transaction = await this.transactionSvc.transferFunds({
        fromAccountId: Number(fromAccountId),
        toAccountId: Number(toAccountId),
        amount: Number(amount),
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        message: "Transfer completed successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Withdraw funds from an account
   */
  async withdrawFunds(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError();
      }

      const { accountId, amount, idempotencyKey } = req.body;

      if (
        accountId === undefined ||
        amount === undefined ||
        !idempotencyKey
      ) {
        throw new BadRequestError(
          "accountId, amount and idempotencyKey are required"
        );
      }

      const transaction = await this.transactionSvc.withdrawFunds({
        accountId: Number(accountId),
        amount: Number(amount),
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        message: "Withdrawal completed successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TransactionController();