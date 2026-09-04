import { AdjutorClient } from "./adjutorClient";
import { AdjutorKarmaResponse } from "./adjutorTypes";

export class MockAdjutorClient extends AdjutorClient {
  constructor() {
    // Pass a dummy key because we override checkKarma()
    // and will never make a real HTTP request.
    super("mock-api-key");
  }

  override async checkKarma(
    identity: string
  ): Promise<AdjutorKarmaResponse | null> {
    // Treat all test identities as clean.
    return null;
  }
}

export default new MockAdjutorClient();