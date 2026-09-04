import bcrypt from "bcryptjs";
import userRepository, { UserRepository } from "../repositories/userRepository";
import accountRepository, {
  AccountRepository,
} from "../repositories/accountRepository";
import { withTransaction } from "../utils/withTransaction";
import { JWT } from "../utils/jwt";
import karmaService, { KarmaService } from "./karmaService";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../errors/applicationError";
import { SignupDTO, LoginDTO, AuthResult } from "../types/authTypes";

const DEFAULT_CURRENCY = "NGN";
const SALT_ROUNDS = 10;

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository = userRepository,
    private readonly accountRepo: AccountRepository = accountRepository,
      private readonly karma: KarmaService = karmaService,
  ) {}

  async signup(data: SignupDTO): Promise<AuthResult> {
    const email = data.email.toLowerCase();

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Lendsqr Karma blacklist check — a user with records here must
    // never be onboarded, regardless of how clean the rest of their
    // signup data looks.
    const karmaResult = await this.karma.isBlacklisted([
      email,
      data.phone_number,
    ]);

    if (karmaResult.isBlacklisted) {
      throw new ForbiddenError(
        "This user cannot be onboarded due to a Karma blacklist record"
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Transaction scoping: user creation and default account creation
    // must both succeed together, or neither should persist.
    const user = await withTransaction(async (trx) => {
      const newUser = await this.userRepo.create(
        {
          first_name: data.first_name,
          last_name: data.last_name,
          email,
          phone_number: data.phone_number,
          password: hashedPassword,
        },
        trx
      );

      await this.accountRepo.create(newUser.id, DEFAULT_CURRENCY, trx);

      return newUser;
    });

    const token = JWT.generateToken({ userId: user.id, email: user.email });

    return { user: this.userRepo.sanitize(user), token };
  }

  async login(data: LoginDTO): Promise<AuthResult> {
    const email = data.email.toLowerCase();
    const user = await this.userRepo.findByEmail(email);

    // Deliberately vague error for both "no such user" and "wrong password" —
    // avoids leaking which part of the credential pair was wrong.
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = JWT.generateToken({ userId: user.id, email: user.email });

    return { user: this.userRepo.sanitize(user), token };
  }

  async logout(): Promise<{ message: string }> {
    // Faux token auth has no server-side session/token store to invalidate;
    // the client simply discards the token it's holding.
    return { message: "Logged out successfully" };
  }
}

export default new AuthService();