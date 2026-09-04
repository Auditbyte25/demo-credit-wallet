import { KarmaService } from "../services/karmaService";
import adjutorClient from "../integrations/adjutor/adjutorClient";
import mockAdjutorClient from "../integrations/adjutor/mockAdjutorClient";

const karmaClient =
  process.env.KARMA_MODE === "mock"
    ? mockAdjutorClient
    : adjutorClient;

export const karmaServiceConfig = new KarmaService(karmaClient);