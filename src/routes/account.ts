import { Router } from "express";
import { authenticate } from "../middleware/auth";
import AccountController from "../controllers/accountController";

const router = Router();

/**
 * - POST /api/v1/accounts/
 * - Create a new account
 * - Protected Route
 */
router.post("/", authenticate, AccountController.createAccount);

/**
 * - GET /api/v1/accounts/
 * - Get all accounts of the logged-in user
 * - Protected Route
 */
router.get("/", authenticate, AccountController.getUserAccounts);

/**
 * - GET /api/v1/accounts/balance/:accountId
 * - Get the balance of a specific account owned by the logged-in user
 * - Protected Route
 */
router.get(
  "/balance/:accountId",
  authenticate,
  AccountController.getAccountBalance
);

export default router;