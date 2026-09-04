import knex, { Knex } from "knex";
import logger from "../services/internal/logger";

let dbInstance: Knex;

const databaseConfig: Knex.Config = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
};

export const connectDatabase = async (): Promise<Knex> => {
  logger.debug("Starting Database connection", "database.ts");

  dbInstance = knex(databaseConfig);

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

export const getDb = (): Knex => {
  if (!dbInstance) {
    throw new Error("Database has not been initialized");
  }

  return dbInstance;
};

// import knex, { Knex } from "knex";
// import knexConfig from "../../knexfile";
// import logger from "../services/internal/logger";

// let dbInstance: Knex;

// export const connectDatabase = async (): Promise<Knex> => {
//   logger.debug("Starting Database connection", "database.ts");

//   dbInstance = knex(knexConfig);

//   try {
//     await dbInstance.raw("select 1 + 1 as result");
//   } catch (e) {
//     logger.error(
//       `Database connection failed! Here's the error => ${e}`,
//       "database.ts"
//     );
//     process.exit(1);
//   }

//   dbInstance.on("query", (query: Knex.Sql) => {
//     logger.debug(`DB Query Ran: ${query.sql}`, "database.ts");
//   });

//   logger.debug("Database connection is good!", "database.ts");
//   return dbInstance;
// };

// export const getDb = (): Knex => dbInstance;