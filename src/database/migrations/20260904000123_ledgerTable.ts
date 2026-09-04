import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("ledgers", (table) => {
    table.increments("id").primary();

    table
      .integer("account_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("accounts")
      .onDelete("RESTRICT")
      .index();

    table
      .integer("transaction_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("transactions")
      .onDelete("RESTRICT")
      .index();

    table.decimal("amount", 14, 2).unsigned().notNullable();

    table
      .enum("type", ["CREDIT", "DEBIT"], {
        useNative: true,
        enumName: "ledger_type",
      })
      .notNullable();

    // Ledger entries are append-only: created_at only, no updated_at.
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("ledgers");
  // Clean up the native enum type if using PostgreSQL; harmless no-op on MySQL.
  await knex.raw('DROP TYPE IF EXISTS "ledger_type"').catch(() => {});
}