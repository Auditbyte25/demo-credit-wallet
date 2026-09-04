import axios, { AxiosInstance, isAxiosError } from "axios";
import { AdjutorKarmaResponse } from "./adjutorTypes";

const ADJUTOR_BASE_URL = "https://adjutor.lendsqr.com/v2";

export class AdjutorClient {
  private readonly http: AxiosInstance;

  constructor(apiKey: string | undefined = process.env.ADJUTOR_API_KEY) {
    if (!apiKey) {
      throw new Error(
        "ADJUTOR_API_KEY is not configured. Set it in your .env file."
      );
    }

    this.http = axios.create({
      baseURL: ADJUTOR_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 10_000,
    });
  }

  /**
   * Looks up a single identity (email, phone, BVN, etc.) against the
   * Karma blacklist. Returns null if the identity has no blacklist
   * record (Adjutor returns 404 in that case), otherwise returns the
   * full response payload.
   */
  async checkKarma(identity: string): Promise<AdjutorKarmaResponse | null> {
    try {
      const { data } = await this.http.get<AdjutorKarmaResponse>(
        `/verification/karma/${encodeURIComponent(identity)}`
      );
      return data;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  }
}

export default new AdjutorClient();