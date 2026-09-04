import { Knex } from "knex";
import { getDb } from "../config/database";

export interface UserRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export type NewUser = Pick<
  UserRecord,
  "first_name" | "last_name" | "email" | "phone_number" | "password"
>;

export class UserRepository {
  private readonly table = "users";

  async findByEmail(
    email: string,
    trx?: Knex.Transaction
  ): Promise<UserRecord | undefined> {
    return (trx ?? getDb())<UserRecord>(this.table).where({ email }).first();
  }

  async findById(
    id: number,
    trx?: Knex.Transaction
  ): Promise<UserRecord | undefined> {
    return (trx ?? getDb())<UserRecord>(this.table).where({ id }).first();
  }

  async create(data: NewUser, trx: Knex.Transaction): Promise<UserRecord> {
    const [id] = await trx<UserRecord>(this.table).insert(data);
    const user = await trx<UserRecord>(this.table).where({ id }).first();

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  }

  /**
   * Strips sensitive fields before a user record is returned to a client.
   */
  sanitize(user: UserRecord): Omit<UserRecord, "password"> {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

export default new UserRepository();