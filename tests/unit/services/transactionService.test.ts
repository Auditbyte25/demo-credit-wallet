jest.mock("../../../src/utils/withTransaction", () => ({
  withTransaction: jest.fn(async (callback) => {
    const trx = {} as any;
    return callback(trx);
  }),
}));

import { TransactionService } from "../../../src/services/transactionService";

import { AccountRepository } from "../../../src/repositories/accountRepository";
import { LedgerRepository } from "../../../src/repositories/ledgerRepository";
import { TransactionRepository } from "../../../src/repositories/transactionRepository";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../src/errors/applicationError";

describe("TransactionService", () => {
  let service: TransactionService;

  let accountRepo: jest.Mocked<AccountRepository>;
  let ledgerRepo: jest.Mocked<LedgerRepository>;
  let transactionRepo: jest.Mocked<TransactionRepository>;

  beforeEach(() => {
    accountRepo = {
      findByIdForUpdate: jest.fn(),
    } as unknown as jest.Mocked<AccountRepository>;

    ledgerRepo = {
      create: jest.fn(),
      getBalance: jest.fn(),
    } as unknown as jest.Mocked<LedgerRepository>;

    transactionRepo = {
      findByIdempotencyKey: jest.fn(),
      create: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as jest.Mocked<TransactionRepository>;

    service = new TransactionService(
      accountRepo,
      ledgerRepo,
      transactionRepo
    );
  });

  describe("fundAccount", () => {
    it("should allow a user to fund their account", async () => {
      const account = {
        id: 1,
        user_id: 1,
        status: "ACTIVE" as const,
        currency: "NGN",
        created_at: new Date(),
        updated_at: new Date(),
      };

      const transaction = {
        id: 1,
        from_account_id: null,
        to_account_id: 1,
        amount: "10000",
        type: "FUNDING" as const,
        idempotency_key: "fund-001",
        status: "PENDING" as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      accountRepo.findByIdForUpdate.mockResolvedValue(account);

      transactionRepo.findByIdempotencyKey
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      transactionRepo.create.mockResolvedValue(transaction);

      ledgerRepo.create.mockResolvedValue({
        id: 1,
        account_id: 1,
        transaction_id: 1,
        amount: "10000",
        type: "CREDIT",
        created_at: new Date(),
      });

      transactionRepo.markCompleted.mockResolvedValue(undefined);

      const result = await service.fundAccount({
        accountId: 1,
        amount: 10000,
        idempotencyKey: "fund-001",
      });

      expect(result.status).toBe("COMPLETED");

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to_account_id: 1,
          amount: "10000",
          type: "FUNDING",
          idempotency_key: "fund-001",
          status: "PENDING",
        }),
        expect.anything()
      );

      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 1,
          amount: "10000",
          type: "CREDIT",
        }),
        expect.anything()
      );

      expect(transactionRepo.markCompleted).toHaveBeenCalled();
    });

    it("should reject funding for a non-existent account", async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.fundAccount({
          accountId: 999,
          amount: 10000,
          idempotencyKey: "fund-002",
        })
      ).rejects.toThrow(NotFoundError);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });

    it("should reject funding for an inactive account", async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue({
        id: 1,
        user_id: 1,
        status: "FROZEN",
        currency: "NGN",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        service.fundAccount({
          accountId: 1,
          amount: 10000,
          idempotencyKey: "fund-003",
        })
      ).rejects.toThrow(ForbiddenError);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });

    it("should reject an invalid funding amount", async () => {
      await expect(
        service.fundAccount({
          accountId: 1,
          amount: 0,
          idempotencyKey: "fund-004",
        })
      ).rejects.toThrow(ConflictError);

      expect(accountRepo.findByIdForUpdate).not.toHaveBeenCalled();
    });

    it("should return the existing transaction for a duplicate idempotency key", async () => {
      const existingTransaction = {
        id: 1,
        from_account_id: null,
        to_account_id: 1,
        amount: "10000",
        type: "FUNDING" as const,
        idempotency_key: "fund-001",
        status: "COMPLETED" as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      transactionRepo.findByIdempotencyKey.mockResolvedValue(
        existingTransaction
      );

      const result = await service.fundAccount({
        accountId: 1,
        amount: 10000,
        idempotencyKey: "fund-001",
      });

      expect(result).toEqual(existingTransaction);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("transferFunds", () => {
    const sender = {
      id: 1,
      user_id: 1,
      status: "ACTIVE" as const,
      currency: "NGN",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const receiver = {
      id: 2,
      user_id: 2,
      status: "ACTIVE" as const,
      currency: "NGN",
      created_at: new Date(),
      updated_at: new Date(),
    };

    it("should allow a user to transfer funds to another account", async () => {
      const transaction = {
        id: 2,
        from_account_id: 1,
        to_account_id: 2,
        amount: "3000",
        type: "TRANSFER" as const,
        idempotency_key: "transfer-001",
        status: "PENDING" as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      accountRepo.findByIdForUpdate
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(receiver);

      transactionRepo.findByIdempotencyKey
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      ledgerRepo.getBalance.mockResolvedValue(10000);

      transactionRepo.create.mockResolvedValue(transaction);

      ledgerRepo.create
        .mockResolvedValueOnce({
          id: 1,
          account_id: 1,
          transaction_id: 2,
          amount: "3000",
          type: "DEBIT",
          created_at: new Date(),
        })
        .mockResolvedValueOnce({
          id: 2,
          account_id: 2,
          transaction_id: 2,
          amount: "3000",
          type: "CREDIT",
          created_at: new Date(),
        });

      transactionRepo.markCompleted.mockResolvedValue(undefined);

      const result = await service.transferFunds({
        fromAccountId: 1,
        toAccountId: 2,
        amount: 3000,
        idempotencyKey: "transfer-001",
      });

      expect(result.status).toBe("COMPLETED");

      expect(ledgerRepo.create).toHaveBeenCalledTimes(2);

      expect(ledgerRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          account_id: 1,
          amount: "3000",
          type: "DEBIT",
        }),
        expect.anything()
      );

      expect(ledgerRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          account_id: 2,
          amount: "3000",
          type: "CREDIT",
        }),
        expect.anything()
      );

      expect(transactionRepo.markCompleted).toHaveBeenCalled();
    });

    it("should reject transferring to the same account", async () => {
      await expect(
        service.transferFunds({
          fromAccountId: 1,
          toAccountId: 1,
          amount: 1000,
          idempotencyKey: "transfer-002",
        })
      ).rejects.toThrow(ConflictError);

      expect(accountRepo.findByIdForUpdate).not.toHaveBeenCalled();
    });

    it("should reject a transfer when an account does not exist", async () => {
      accountRepo.findByIdForUpdate
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(undefined);

      await expect(
        service.transferFunds({
          fromAccountId: 1,
          toAccountId: 999,
          amount: 1000,
          idempotencyKey: "transfer-003",
        })
      ).rejects.toThrow(NotFoundError);

      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });

    it("should reject a transfer from an inactive account", async () => {
      accountRepo.findByIdForUpdate
        .mockResolvedValueOnce({
          ...sender,
          status: "FROZEN",
        })
        .mockResolvedValueOnce(receiver);

      await expect(
        service.transferFunds({
          fromAccountId: 1,
          toAccountId: 2,
          amount: 1000,
          idempotencyKey: "transfer-004",
        })
      ).rejects.toThrow(ForbiddenError);

      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });

    it("should reject a transfer when the balance is insufficient", async () => {
      accountRepo.findByIdForUpdate
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(receiver);

      transactionRepo.findByIdempotencyKey
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      ledgerRepo.getBalance.mockResolvedValue(1000);

      await expect(
        service.transferFunds({
          fromAccountId: 1,
          toAccountId: 2,
          amount: 5000,
          idempotencyKey: "transfer-005",
        })
      ).rejects.toThrow(ConflictError);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });

    it("should not process a duplicate transfer", async () => {
      const existingTransaction = {
        id: 2,
        from_account_id: 1,
        to_account_id: 2,
        amount: "3000",
        type: "TRANSFER" as const,
        idempotency_key: "transfer-001",
        status: "COMPLETED" as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      transactionRepo.findByIdempotencyKey.mockResolvedValue(
        existingTransaction
      );

      const result = await service.transferFunds({
        fromAccountId: 1,
        toAccountId: 2,
        amount: 3000,
        idempotencyKey: "transfer-001",
      });

      expect(result).toEqual(existingTransaction);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("withdrawFunds", () => {
    const account = {
      id: 1,
      user_id: 1,
      status: "ACTIVE" as const,
      currency: "NGN",
      created_at: new Date(),
      updated_at: new Date(),
    };

    it("should allow a user to withdraw funds", async () => {
      const transaction = {
        id: 3,
        from_account_id: 1,
        to_account_id: 1,
        amount: "2000",
        type: "WITHDRAWAL" as const,
        idempotency_key: "withdraw-001",
        status: "PENDING" as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      accountRepo.findByIdForUpdate.mockResolvedValue(account);

      transactionRepo.findByIdempotencyKey
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      ledgerRepo.getBalance.mockResolvedValue(7000);

      transactionRepo.create.mockResolvedValue(transaction);

      ledgerRepo.create.mockResolvedValue({
        id: 3,
        account_id: 1,
        transaction_id: 3,
        amount: "2000",
        type: "DEBIT",
        created_at: new Date(),
      });

      transactionRepo.markCompleted.mockResolvedValue(undefined);

      const result = await service.withdrawFunds({
        accountId: 1,
        amount: 2000,
        idempotencyKey: "withdraw-001",
      });

      expect(result.status).toBe("COMPLETED");

      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 1,
          amount: "2000",
          type: "DEBIT",
        }),
        expect.anything()
      );

      expect(transactionRepo.markCompleted).toHaveBeenCalled();
    });

    it("should reject withdrawal from a non-existent account", async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.withdrawFunds({
          accountId: 999,
          amount: 2000,
          idempotencyKey: "withdraw-002",
        })
      ).rejects.toThrow(NotFoundError);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });

    it("should reject withdrawal from an inactive account", async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue({
        ...account,
        status: "FROZEN",
      });

      await expect(
        service.withdrawFunds({
          accountId: 1,
          amount: 2000,
          idempotencyKey: "withdraw-003",
        })
      ).rejects.toThrow(ForbiddenError);

      expect(transactionRepo.create).not.toHaveBeenCalled();
    });

    it("should reject withdrawal when the balance is insufficient", async () => {
      accountRepo.findByIdForUpdate.mockResolvedValue(account);

      transactionRepo.findByIdempotencyKey
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      ledgerRepo.getBalance.mockResolvedValue(1000);

      await expect(
        service.withdrawFunds({
          accountId: 1,
          amount: 5000,
          idempotencyKey: "withdraw-004",
        })
      ).rejects.toThrow(ConflictError);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });

    it("should reject an invalid withdrawal amount", async () => {
      await expect(
        service.withdrawFunds({
          accountId: 1,
          amount: 0,
          idempotencyKey: "withdraw-005",
        })
      ).rejects.toThrow(ConflictError);

      expect(accountRepo.findByIdForUpdate).not.toHaveBeenCalled();
    });

    it("should not process a duplicate withdrawal", async () => {
      const existingTransaction = {
        id: 3,
        from_account_id: 1,
        to_account_id: 1,
        amount: "2000",
        type: "WITHDRAWAL" as const,
        idempotency_key: "withdraw-001",
        status: "COMPLETED" as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      transactionRepo.findByIdempotencyKey.mockResolvedValue(
        existingTransaction
      );

      const result = await service.withdrawFunds({
        accountId: 1,
        amount: 2000,
        idempotencyKey: "withdraw-001",
      });

      expect(result).toEqual(existingTransaction);

      expect(transactionRepo.create).not.toHaveBeenCalled();
      expect(ledgerRepo.create).not.toHaveBeenCalled();
    });
  });
});