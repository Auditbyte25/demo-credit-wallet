import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("transactions", (table) => {
    table
      .integer("from_account_id")
      .unsigned()
      .nullable()
      .alter();

    table
      .enum("type", ["FUNDING", "TRANSFER", "WITHDRAWAL"])
      .notNullable()
      .after("to_account_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("transactions", (table) => {
    table.dropColumn("type");

    table
      .integer("from_account_id")
      .unsigned()
      .notNullable()
      .alter();
  });
}