import bcrypt from "bcryptjs";
import { AuthService } from "../../../src/services/authService";
import { UserRepository, UserRecord } from "../../../src/repositories/userRepository";
import { AccountRepository, AccountRecord } from "../../../src/repositories/accountRepository";
// import { KarmaService } from "../../../src/services/karmaService";
import { KarmaService } from "../../../src/services/karmaService";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "../../../src/errors/applicationError";
import { withTransaction } from "../../../src/utils/withTransaction";
import { JWT } from "../../../src/utils/jwt";
// import "dotenv/config";
jest.mock("../../../src/services/karmaService", () => ({
  KarmaService: jest.fn(),
  default: {},
}));

// Mock everything that isn't constructor-injected, since these are
// called as module-level imports inside AuthService.
jest.mock("../../../src/utils/withTransaction");
jest.mock("../../../src/utils/jwt");
jest.mock("bcryptjs");

const mockedWithTransaction = withTransaction as jest.MockedFunction<
  typeof withTransaction
>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe("AuthService", () => {
  let userRepo: jest.Mocked<Pick<UserRepository, "findByEmail" | "create" | "sanitize" | "findById">>;
  let accountRepo: jest.Mocked<Pick<AccountRepository, "create" | "findByUserId">>;
  let karma: jest.Mocked<Pick<KarmaService, "isBlacklisted">>;
  let authService: AuthService;

  const mockUser: UserRecord = {
    id: 1,
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone_number: "08012345678",
    password: "hashed-password",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAccount: AccountRecord = {
    id: 1,
    user_id: 1,
    status: "ACTIVE",
    currency: "NGN",
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      sanitize: jest.fn((user: UserRecord) => {
        const { password, ...safeUser } = user;
        return safeUser;
      }),
    };

    accountRepo = {
      create: jest.fn(),
      findByUserId: jest.fn(),
    };

    karma = {
      isBlacklisted: jest.fn(),
    };

    authService = new AuthService(
      userRepo as unknown as UserRepository,
      accountRepo as unknown as AccountRepository,
      karma as unknown as KarmaService
    );

    (JWT.generateToken as jest.Mock).mockReturnValue("fake-jwt-token");
  });

  describe("signup", () => {
    const signupData = {
      first_name: "John",
      last_name: "Doe",
      email: "John.Doe@Example.com",
      phone_number: "08012345678",
      password: "Password123!",
    };

    it("creates a new user and their default account, and returns a sanitized user with a token (positive)", async () => {
      userRepo.findByEmail.mockResolvedValue(undefined);
      karma.isBlacklisted.mockResolvedValue({ isBlacklisted: false });
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockedWithTransaction.mockImplementation(async (callback) =>
        callback({} as never)
      );
      userRepo.create.mockResolvedValue(mockUser);
      accountRepo.create.mockResolvedValue(mockAccount);

      const result = await authService.signup(signupData);

      expect(userRepo.findByEmail).toHaveBeenCalledWith("john.doe@example.com");
      expect(karma.isBlacklisted).toHaveBeenCalledWith([
        "john.doe@example.com",
        signupData.phone_number,
      ]);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "john.doe@example.com" }),
        expect.anything()
      );
      expect(accountRepo.create).toHaveBeenCalledWith(
        mockUser.id,
        "NGN",
        expect.anything()
      );
      expect(result.token).toBe("fake-jwt-token");
      expect(result.user).not.toHaveProperty("password");
      expect(result.user.email).toBe(mockUser.email);
    });

    it("throws ConflictError when the email is already registered (negative)", async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.signup(signupData)).rejects.toThrow(
        ConflictError
      );

      // Should short-circuit before any external/paid Karma call is made.
      expect(karma.isBlacklisted).not.toHaveBeenCalled();
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it("throws ForbiddenError when the user is on the Karma blacklist (negative)", async () => {
      userRepo.findByEmail.mockResolvedValue(undefined);
      karma.isBlacklisted.mockResolvedValue({
        isBlacklisted: true,
        reason: "Chronic loan defaulter",
      });

      await expect(authService.signup(signupData)).rejects.toThrow(
        ForbiddenError
      );

      // Should never hash a password or write to the DB for a blacklisted user.
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(userRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const loginData = { email: "john.doe@example.com", password: "Password123!" };

    it("returns a sanitized user and token for valid credentials (positive)", async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await authService.login(loginData);

      expect(result.token).toBe("fake-jwt-token");
      expect(result.user).not.toHaveProperty("password");
    });

    it("throws UnauthorizedError when the user does not exist (negative)", async () => {
      userRepo.findByEmail.mockResolvedValue(undefined);

      await expect(authService.login(loginData)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it("throws UnauthorizedError when the password is incorrect (negative)", async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(loginData)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe("logout", () => {
    it("returns a success message (positive)", async () => {
      const result = await authService.logout();
      expect(result).toEqual({ message: "Logged out successfully" });
    });
  });
});