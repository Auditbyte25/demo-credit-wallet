import { Request, Response, NextFunction } from "express";

/**
 * Wraps an async controller/middleware function so any rejected promise
 * (thrown error) is forwarded to next(), instead of needing a try/catch
 * in every single handler. Generic over the request type so it works
 * with both plain Request and AuthRequest (post-auth-middleware).
 */
const catchAsyncErrors = <Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Req, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsyncErrors;