import adjutorClient, {
  AdjutorClient,
} from "../integrations/adjutor/adjutorClient";

import logger from "./internal/logger";

export interface KarmaCheckResult {
  isBlacklisted: boolean;
  reason?: string | null;
}

export class KarmaService {
  constructor(
    private readonly client: AdjutorClient = adjutorClient
  ) {}

  async isBlacklisted(
    identities: string[]
  ): Promise<KarmaCheckResult> {
    for (const identity of identities) {
      const result = await this.client.checkKarma(identity);

      // No Karma record found.
      if (!result) {
        continue;
      }

      // Adjutor test mode returns a mock blacklist record.
      // Do NOT treat that mock record as a real blacklist hit.
      if (result["mock-response"]) {
        logger.warn(
          `Karma test-mode mock response ignored for identity: ${identity}`,
          "karma.service.ts",
          {
            message: result["mock-response"],
          }
        );

        continue;
      }

      // Real Karma blacklist record.
      if (
        result.status === "success" &&
        result.data !== null
      ) {
        logger.warn(
          `Karma blacklist hit for identity: ${identity}`,
          "karma.service.ts",
          {
            reason: result.data.reason,
            karma_type: result.data.karma_type,
          }
        );

        return {
          isBlacklisted: true,
          reason:
            result.data.reason ??
            "Flagged on Karma blacklist",
        };
      }
    }

    return {
      isBlacklisted: false,
    };
  }
}

export default new KarmaService();

// import adjutorClient, { AdjutorClient } from "../integrations/adjutor/adjutorClient";
// import logger from "./internal/logger";

// export interface KarmaCheckResult {
//   isBlacklisted: boolean;
//   reason?: string | null;
// }

// export class KarmaService {
//   constructor(private readonly client: AdjutorClient = adjutorClient) {}

//   /**
//    * Checks a list of identities (e.g. email and phone number) against
//    * the Karma blacklist. Returns as soon as the first hit is found,
//    * since a single blacklist match is enough to block onboarding.
//    */
//   async isBlacklisted(identities: string[]): Promise<KarmaCheckResult> {
//     for (const identity of identities) {
//       const result = await this.client.checkKarma(identity);

//       if (result && result.data) {
//         logger.warn(
//           `Karma blacklist hit for identity: ${identity}`,
//           "karma.service.ts",
//           { reason: result.data.reason, karma_type: result.data.karma_type }
//         );

//         return {
//           isBlacklisted: true,
//           reason: result.data.reason ?? "Flagged on Karma blacklist",
//         };
//       }
//     }

//     return { isBlacklisted: false };
//   }
// }

// export default new KarmaService();