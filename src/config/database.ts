import knex, { Knex } from "knex";
import knexConfig from "../../knexfile";
import logger from "../services/internal/logger";

let dbInstance: Knex;

export const connectDatabase = async (): Promise<Knex> => {
  logger.debug("Starting Database connection", "database.ts");

  dbInstance = knex(knexConfig);

  try {
    await dbInstance.raw("select 1 + 1 as result");
  } catch (e) {
    logger.error(
      `Database connection failed! Here's the error => ${e}`,
      "database.ts"
    );
    process.exit(1);
  }

  dbInstance.on("query", (query: Knex.Sql) => {
    logger.debug(`DB Query Ran: ${query.sql}`, "database.ts");
  });

  logger.debug("Database connection is good!", "database.ts");
  return dbInstance;
};

export const getDb = (): Knex => dbInstance;