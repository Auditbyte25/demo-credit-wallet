import { Knex } from "knex";
import { getDb } from "../config/database";

export interface LedgerRecord {
  id: number;
  account_id: number;
  transaction_id: number;
  amount: string;
  type: "CREDIT" | "DEBIT";
  created_at: Date;
}

export type NewLedgerEntry = Pick<
  LedgerRecord,
  "account_id" | "transaction_id" | "amount" | "type"
>;

export class LedgerRepository {
  private readonly table = "ledgers";

  async create(
    data: NewLedgerEntry,
    trx: Knex.Transaction
  ): Promise<LedgerRecord> {
    const [id] = await trx<LedgerRecord>(this.table).insert(data);
    const entry = await trx<LedgerRecord>(this.table).where({ id }).first();

    if (!entry) {
      throw new Error("Failed to create ledger entry");
    }

    return entry;
  }

  /**
   * Computes an account's balance as the sum of all CREDIT entries
   * minus the sum of all DEBIT entries. The balance is never stored
   * directly — it's always derived from the immutable ledger, matching
   * the double-entry design of the source schema.
   */
  async getBalance(accountId: number, trx?: Knex.Transaction): Promise<number> {
    const db = trx ?? getDb();

    const result = await db<LedgerRecord>(this.table)
      .where({ account_id: accountId })
      .select(
        db.raw(`
          COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0)
          AS balance
        `)
      )
      .first<{ balance: string }>();

    return Number(result?.balance ?? 0);
  }
}

export default new LedgerRepository();