import { Router } from "express";

import { authenticate } from "../middleware/auth";
import TransactionController from "../controllers/transactionController";

const router = Router();

/**
 * - POST /api/v1/transactions/fund
 * - Fund the logged-in user's account
 * - Protected Route
 */
router.post(
  "/fund",
  authenticate,
  TransactionController.fundAccount
);

/**
 * - POST /api/v1/transactions/transfer
 * - Transfer funds to another user's account
 * - Protected Route
 */
router.post(
  "/transfer",
  authenticate,
  TransactionController.transferFunds
);

/**
 * - POST /api/v1/transactions/withdraw
 * - Withdraw funds from the logged-in user's account
 * - Protected Route
 */
router.post(
  "/withdraw",
  authenticate,
  TransactionController.withdrawFunds
);

export default router;