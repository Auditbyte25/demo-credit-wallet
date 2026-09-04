import { Knex } from "knex";

import accountRepository, {
  AccountRepository,
} from "../repositories/accountRepository";

import ledgerRepository, {
  LedgerRepository,
} from "../repositories/ledgerRepository";

import transactionRepository, {
  TransactionRepository,
  TransactionRecord,
} from "../repositories/transactionRepository";

import { withTransaction } from "../utils/withTransaction";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/applicationError";

export interface FundAccountInput {
  accountId: number;
  amount: number;
  idempotencyKey: string;
}

export interface TransferFundsInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  idempotencyKey: string;
}

export interface WithdrawFundsInput {
  accountId: number;
  amount: number;
  idempotencyKey: string;
}

export class TransactionService {
  constructor(
    private readonly accountRepo: AccountRepository = accountRepository,
    private readonly ledgerRepo: LedgerRepository = ledgerRepository,
    private readonly transactionRepo: TransactionRepository =
      transactionRepository
  ) {}

  /**
   * Fund a user's account.
   *
   * A successful funding creates:
   *
   * Transaction: FUNDING / COMPLETED
   * Ledger: CREDIT
   */
  async fundAccount(
    data: FundAccountInput
  ): Promise<TransactionRecord> {
    this.validateAmount(data.amount);
    this.validateIdempotencyKey(data.idempotencyKey);

    const existing = await this.transactionRepo.findByIdempotencyKey(
      data.idempotencyKey
    );

    if (existing) {
      return this.handleExistingTransaction(existing);
    }

    return withTransaction(async (trx) => {
      /*
       * Lock the account row while processing the transaction.
       */
      const account = await this.accountRepo.findByIdForUpdate(
        data.accountId,
        trx
      );

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (account.status !== "ACTIVE") {
        throw new ForbiddenError("Account is not active");
      }

      /*
       * The idempotency check is repeated inside the DB transaction
       * because another request could have created the transaction
       * after our initial check.
       */
      const existingInsideTransaction =
        await this.transactionRepo.findByIdempotencyKey(
          data.idempotencyKey,
          trx
        );

      if (existingInsideTransaction) {
        return this.handleExistingTransaction(
          existingInsideTransaction
        );
      }

      const transaction = await this.transactionRepo.create(
        {
          from_account_id: null,
          to_account_id: data.accountId,
          amount: data.amount.toString(),
          type: "FUNDING",
          idempotency_key: data.idempotencyKey,
          status: "PENDING",
        },
        trx
      );

      try {
        await this.ledgerRepo.create(
          {
            account_id: data.accountId,
            transaction_id: transaction.id,
            amount: data.amount.toString(),
            type: "CREDIT",
          },
          trx
        );

        await this.transactionRepo.markCompleted(
          transaction.id,
          trx
        );

        return {
          ...transaction,
          status: "COMPLETED",
        };
      } catch (error) {
        await this.transactionRepo.markFailed(
          transaction.id,
          trx
        );

        throw error;
      }
    });
  }

  /**
   * Transfer funds between two user accounts.
   *
   * Sender:
   *   DEBIT
   *
   * Receiver:
   *   CREDIT
   *
   * Both ledger entries are committed atomically.
   */
  async transferFunds(
    data: TransferFundsInput
  ): Promise<TransactionRecord> {
    this.validateAmount(data.amount);
    this.validateIdempotencyKey(data.idempotencyKey);

    if (data.fromAccountId === data.toAccountId) {
      throw new ConflictError(
        "You cannot transfer funds to the same account"
      );
    }

    const existing = await this.transactionRepo.findByIdempotencyKey(
      data.idempotencyKey
    );

    if (existing) {
      return this.handleExistingTransaction(existing);
    }

    return withTransaction(async (trx) => {
      /*
       * Lock sender and receiver rows.
       *
       * Always lock them in deterministic ID order to reduce the
       * possibility of deadlocks when two transfers happen
       * simultaneously in opposite directions.
       */
      const firstAccountId = Math.min(
        data.fromAccountId,
        data.toAccountId
      );

      const secondAccountId = Math.max(
        data.fromAccountId,
        data.toAccountId
      );

      const firstAccount =
        await this.accountRepo.findByIdForUpdate(
          firstAccountId,
          trx
        );

      const secondAccount =
        await this.accountRepo.findByIdForUpdate(
          secondAccountId,
          trx
        );

      if (!firstAccount || !secondAccount) {
        throw new NotFoundError(
          "Sender or receiver account not found"
        );
      }

      const sender =
        data.fromAccountId === firstAccount.id
          ? firstAccount
          : secondAccount;

      const receiver =
        data.toAccountId === firstAccount.id
          ? firstAccount
          : secondAccount;

      if (sender.status !== "ACTIVE") {
        throw new ForbiddenError(
          "Sender account is not active"
        );
      }

      if (receiver.status !== "ACTIVE") {
        throw new ForbiddenError(
          "Receiver account is not active"
        );
      }

      /*
       * Repeat idempotency check after acquiring the locks.
       */
      const existingInsideTransaction =
        await this.transactionRepo.findByIdempotencyKey(
          data.idempotencyKey,
          trx
        );

      if (existingInsideTransaction) {
        return this.handleExistingTransaction(
          existingInsideTransaction
        );
      }

      /*
       * Calculate balance while the sender account is locked.
       */
      const balance = await this.ledgerRepo.getBalance(
        sender.id,
        trx
      );

      if (balance < data.amount) {
        throw new ConflictError(
          `Insufficient balance. Current balance is ${balance}. Requested amount is ${data.amount}`
        );
      }

      /*
       * Create transaction as PENDING.
       */
      const transaction = await this.transactionRepo.create(
        {
          from_account_id: sender.id,
          to_account_id: receiver.id,
          amount: data.amount.toString(),
          type: "TRANSFER",
          idempotency_key: data.idempotencyKey,
          status: "PENDING",
        },
        trx
      );

      try {
        /*
         * Debit sender.
         */
        await this.ledgerRepo.create(
          {
            account_id: sender.id,
            transaction_id: transaction.id,
            amount: data.amount.toString(),
            type: "DEBIT",
          },
          trx
        );

        /*
         * Credit receiver.
         */
        await this.ledgerRepo.create(
          {
            account_id: receiver.id,
            transaction_id: transaction.id,
            amount: data.amount.toString(),
            type: "CREDIT",
          },
          trx
        );

        /*
         * Mark transaction completed.
         */
        await this.transactionRepo.markCompleted(
          transaction.id,
          trx
        );

        return {
          ...transaction,
          status: "COMPLETED",
        };
      } catch (error) {
        await this.transactionRepo.markFailed(
          transaction.id,
          trx
        );

        throw error;
      }
    });
  }

  /**
   * Withdraw funds from a user's account.
   *
   * A withdrawal creates:
   *
   * Transaction: WITHDRAWAL / COMPLETED
   * Ledger: DEBIT
   */
  async withdrawFunds(
    data: WithdrawFundsInput
  ): Promise<TransactionRecord> {
    this.validateAmount(data.amount);
    this.validateIdempotencyKey(data.idempotencyKey);

    const existing = await this.transactionRepo.findByIdempotencyKey(
      data.idempotencyKey
    );

    if (existing) {
      return this.handleExistingTransaction(existing);
    }

    return withTransaction(async (trx) => {
      /*
       * Lock account before checking balance.
       */
      const account = await this.accountRepo.findByIdForUpdate(
        data.accountId,
        trx
      );

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (account.status !== "ACTIVE") {
        throw new ForbiddenError("Account is not active");
      }

      /*
       * Repeat idempotency check inside transaction.
       */
      const existingInsideTransaction =
        await this.transactionRepo.findByIdempotencyKey(
          data.idempotencyKey,
          trx
        );

      if (existingInsideTransaction) {
        return this.handleExistingTransaction(
          existingInsideTransaction
        );
      }

      /*
       * Calculate balance while account is locked.
       */
      const balance = await this.ledgerRepo.getBalance(
        account.id,
        trx
      );

      if (balance < data.amount) {
        throw new ConflictError(
          `Insufficient balance. Current balance is ${balance}. Requested amount is ${data.amount}`
        );
      }

      /*
       * Create PENDING withdrawal transaction.
       */
      const transaction = await this.transactionRepo.create(
        {
          from_account_id: account.id,
          to_account_id: account.id,
          amount: data.amount.toString(),
          type: "WITHDRAWAL",
          idempotency_key: data.idempotencyKey,
          status: "PENDING",
        },
        trx
      );

      try {
        /*
         * Debit user's account.
         */
        await this.ledgerRepo.create(
          {
            account_id: account.id,
            transaction_id: transaction.id,
            amount: data.amount.toString(),
            type: "DEBIT",
          },
          trx
        );

        await this.transactionRepo.markCompleted(
          transaction.id,
          trx
        );

        return {
          ...transaction,
          status: "COMPLETED",
        };
      } catch (error) {
        await this.transactionRepo.markFailed(
          transaction.id,
          trx
        );

        throw error;
      }
    });
  }

  private validateAmount(amount: number): void {
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new ConflictError(
        "Amount must be a valid number greater than zero"
      );
    }
  }

  private validateIdempotencyKey(key: string): void {
    if (
      typeof key !== "string" ||
      key.trim().length === 0
    ) {
      throw new ConflictError(
        "Idempotency key is required"
      );
    }
  }

  private handleExistingTransaction(
    transaction: TransactionRecord
  ): TransactionRecord {
    switch (transaction.status) {
      case "COMPLETED":
        return transaction;

      case "PENDING":
        throw new ConflictError(
          "Transaction is already being processed"
        );

      case "FAILED":
        throw new ConflictError(
          "Transaction previously failed. Please use a new idempotency key."
        );

      default:
        throw new ConflictError(
          "Transaction cannot be processed"
        );
    }
  }
}

export default new TransactionService();

