import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("accounts", (table) => {
    table.increments("id").primary();

    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .index();

    table
      .enum("status", ["ACTIVE", "FROZEN", "CLOSED"], {
        useNative: true,
        enumName: "account_status",
      })
      .notNullable()
      .defaultTo("ACTIVE");

    table.string("currency", 3).notNullable().defaultTo("NGN");

    table.timestamps(true, true); // created_at, updated_at

    // Matches accountSchema.index({ user: 1, status: 1 })
    table.index(["user_id", "status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("accounts");
  // Clean up the native enum type if using PostgreSQL; harmless no-op on MySQL.
  await knex.raw('DROP TYPE IF EXISTS "account_status"').catch(() => {});
}