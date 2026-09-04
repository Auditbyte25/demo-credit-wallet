import accountRepository, {
  AccountRepository,
  AccountRecord,
} from "../repositories/accountRepository";
import ledgerRepository, {
  LedgerRepository,
} from "../repositories/ledgerRepository";
import { NotFoundError } from "../errors/applicationError";

const DEFAULT_CURRENCY = "NGN";

export interface AccountBalance {
  accountId: number;
  balance: number;
}

export class AccountService {
  constructor(
    private readonly accountRepo: AccountRepository = accountRepository,
    private readonly ledgerRepo: LedgerRepository = ledgerRepository
  ) {}

  async createAccount(
    userId: number,
    currency: string = DEFAULT_CURRENCY
  ): Promise<AccountRecord> {
    return this.accountRepo.create(userId, currency);
  }

  async getUserAccounts(userId: number): Promise<AccountRecord[]> {
    return this.accountRepo.findAllByUserId(userId);
  }

  async getAccountBalance(
    accountId: number,
    userId: number
  ): Promise<AccountBalance> {
    const account = await this.accountRepo.findById(accountId);

    // Same "Account not found" response whether the account doesn't exist
    // at all, or exists but belongs to someone else — don't leak which.
    if (!account || account.user_id !== userId) {
      throw new NotFoundError("Account not found");
    }

    const balance = await this.ledgerRepo.getBalance(account.id);

    return { accountId: account.id, balance };
  }
}

export default new AccountService();