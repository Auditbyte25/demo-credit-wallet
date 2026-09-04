// import express from "express";
// // import cors from "cors";
// import bodyParser from "body-parser";
// import dotenv from "dotenv";
// import logger from "./services/internal/logger";

// // Initiallising app
// const app = express();

// export default app;

import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import errorMiddleware from "./middleware/error";
import logger from "./services/internal/logger";

// Routes
import authRouter from "./routes/auth";
import accountRouter from "./routes/account";
import transactionRouter from "./routes/transaction";

dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/accounts", accountRouter);
app.use("/api/v1/transactions", transactionRouter);

// Error handling — must be registered LAST, after all routes,
// since errors only reach this middleware via next(err) from upstream handlers.
app.use(errorMiddleware);

export default app;