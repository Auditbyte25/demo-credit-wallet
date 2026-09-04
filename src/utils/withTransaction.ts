import { Knex } from "knex";
import { getDb } from "../config/database";

/**
 * Wraps a set of DB operations in a single Knex transaction.
 * Pass the trx object into every repository call inside the callback
 * so all writes commit or roll back together.
 */
export const withTransaction = async <T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> => {
  return getDb().transaction(callback);
};