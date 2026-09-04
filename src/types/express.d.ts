import { Request } from "express";
import { AuthTokenPayload } from "./authTypes";

/**
 * Express Request extended with the decoded token payload,
 * attached by the auth middleware after verifying a bearer token.
 */
export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
}

// import { AuthTokenPayload } from "./authTypes";

// declare global {
//   namespace Express {
//     interface Request {
//       user?: AuthTokenPayload;
//     }
//   }
// }

// export interface AuthRequest extends Request {
//   user?: AuthTokenPayload;
// }

// export {};