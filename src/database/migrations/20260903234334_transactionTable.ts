import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("transactions", (table) => {
    table.increments("id").primary();

    table
      .integer("from_account_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("accounts")
      .onDelete("CASCADE")
      .index();

    table
      .integer("to_account_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("accounts")
      .onDelete("CASCADE")
      .index();

    table
      .enum("type", ["FUNDING", "TRANSFER", "WITHDRAWAL"])
      .notNullable();

    table
      .enum("status", ["PENDING", "COMPLETED", "FAILED", "REVERSED"])
      .notNullable()
      .defaultTo("PENDING");

    table
      .decimal("amount", 14, 2)
      .unsigned()
      .notNullable();

    table
      .string("idempotency_key", 191)
      .notNullable()
      .unique()
      .index();

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("transactions");
}

// import { Knex } from "knex";

// export async function up(knex: Knex): Promise<void> {
//   return knex.schema.createTable("transactions", (table) => {
//     table.increments("id").primary();

//     table
//       .integer("from_account_id")
//       .unsigned()
//       .notNullable()
//       .references("id")
//       .inTable("accounts")
//       .onDelete("CASCADE")
//       .index();

//     table
//       .integer("to_account_id")
//       .unsigned()
//       .notNullable()
//       .references("id")
//       .inTable("accounts")
//       .onDelete("CASCADE")
//       .index();

//     table
//       .enum("status", ["PENDING", "COMPLETED", "FAILED", "REVERSED"], {
//         useNative: true,
//         enumName: "transaction_status",
//       })
//       .notNullable()
//       .defaultTo("PENDING");

//     table.decimal("amount", 14, 2).unsigned().notNullable();

//     table.string("idempotency_key", 191).notNullable().unique().index();

//     table.timestamps(true, true); // created_at, updated_at
//   });
// }

// export async function down(knex: Knex): Promise<void> {
//   await knex.schema.dropTableIfExists("transactions");
//   // Clean up the native enum type if using PostgreSQL; harmless no-op on MySQL.
//   await knex.raw('DROP TYPE IF EXISTS "transaction_status"').catch(() => {});
// }

