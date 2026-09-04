import { Knex } from "knex";
import { getDb } from "../config/database";

export interface AccountRecord {
  id: number;
  user_id: number;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export class AccountRepository {
  private readonly table = "accounts";

  async create(
    userId: number,
    currency: string,
    trx?: Knex.Transaction
  ): Promise<AccountRecord> {
    const db = trx ?? getDb();
    const [id] = await db<AccountRecord>(this.table).insert({
      user_id: userId,
      currency,
    });

    const account = await db<AccountRecord>(this.table).where({ id }).first();

    if (!account) {
      throw new Error("Failed to create account");
    }

    return account;
  }

  async findById(
    id: number,
    trx?: Knex.Transaction
  ): Promise<AccountRecord | undefined> {
    return (trx ?? getDb())<AccountRecord>(this.table).where({ id }).first();
  }

  async findByUserId(
    userId: number,
    trx?: Knex.Transaction
  ): Promise<AccountRecord | undefined> {
    return (trx ?? getDb())<AccountRecord>(this.table)
      .where({ user_id: userId })
      .first();
  }

  async findAllByUserId(
    userId: number,
    trx?: Knex.Transaction
  ): Promise<AccountRecord[]> {
    return (trx ?? getDb())<AccountRecord>(this.table)
      .where({ user_id: userId })
      .orderBy("created_at", "asc");
  }
    

    async findByIdForUpdate(
    id: number,
    trx: Knex.Transaction
    ): Promise<AccountRecord | undefined> {
    return trx<AccountRecord>(this.table)
        .where({ id })
        .forUpdate()
        .first();
    }

}

export default new AccountRepository();