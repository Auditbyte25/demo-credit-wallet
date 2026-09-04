import { Knex } from "knex";
import { getDb } from "../config/database";

export type TransactionType =
  | "FUNDING"
  | "TRANSFER"
  | "WITHDRAWAL";

export type TransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

export interface TransactionRecord {
  id: number;
  from_account_id: number | null;
  to_account_id: number;
  amount: string;
  type: TransactionType;
  idempotency_key: string;
  status: TransactionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransactionData {
  from_account_id?: number | null;
  to_account_id: number;
  amount: string;
  type: TransactionType;
  idempotency_key: string;
  status: TransactionStatus;
}

export class TransactionRepository {
  private readonly table = "transactions";

  async create(
    data: CreateTransactionData,
    trx: Knex.Transaction
  ): Promise<TransactionRecord> {
    const [id] = await trx<TransactionRecord>(this.table).insert(data);

    const transaction = await trx<TransactionRecord>(this.table)
      .where({ id })
      .first();

    if (!transaction) {
      throw new Error("Failed to create transaction");
    }

    return transaction;
  }

  async findById(
    id: number,
    trx?: Knex.Transaction
  ): Promise<TransactionRecord | undefined> {
    const db = trx ?? getDb();

    return db<TransactionRecord>(this.table)
      .where({ id })
      .first();
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    trx?: Knex.Transaction
  ): Promise<TransactionRecord | undefined> {
    const db = trx ?? getDb();

    return db<TransactionRecord>(this.table)
      .where({
        idempotency_key: idempotencyKey,
      })
      .first();
  }

  async markCompleted(
    id: number,
    trx: Knex.Transaction
  ): Promise<void> {
    await trx<TransactionRecord>(this.table)
      .where({ id })
      .update({
        status: "COMPLETED",
        updated_at: trx.fn.now(),
      });
  }

  async markFailed(
    id: number,
    trx: Knex.Transaction
  ): Promise<void> {
    await trx<TransactionRecord>(this.table)
      .where({ id })
      .update({
        status: "FAILED",
        updated_at: trx.fn.now(),
      });
  }
}

export default new TransactionRepository();