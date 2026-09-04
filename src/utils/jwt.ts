import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types/authTypes";

// Faux token-based auth, per project spec — a single signed JWT,
// no refresh tokens, no server-side session store.
const JWT_SECRET = process.env.JWT_SECRET || "123456hhjhikw";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

export class JWT {
  static generateToken(payload: AuthTokenPayload): string {
    const options: jwt.SignOptions = {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign(payload, JWT_SECRET, options);
  }

  static verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  }
}