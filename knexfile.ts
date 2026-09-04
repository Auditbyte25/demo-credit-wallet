import { Knex } from "knex";

const config: Knex.Config = {
    client: "mysql2",
    connection: {
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: "",       // or your actual root password
        database: "todo",
    },
    migrations: {
        directory: "./src/database/migrations",
  },
    seeds: {
    directory: "./src/database/seeds"
  }
};

export default config;