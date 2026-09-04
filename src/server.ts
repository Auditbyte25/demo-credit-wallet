import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  // Connect to the database first — fail fast if it's unreachable,
  // rather than starting a server that can't actually serve requests.
  await connectDatabase();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Uncaught synchronous exceptions
  process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log("Shutting down the server for handling uncaught exception");
    process.exit(1);
  });

  // Unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    console.log(`Error: ${reason}`);
    console.log("Shutting down the server for unhandled promise rejection");
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();