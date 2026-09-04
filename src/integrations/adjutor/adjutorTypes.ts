// export interface AdjutorKarmaData {
//   karma_identity: string;
//   amount_in_contention: string;
//   reason: string | null;
//   default_date: string | null;
//   karma_type: {
//     karma: string;
//   };
//   karma_identity_type: {
//     identity_type: string;
//   };
//   reporting_entity: {
//     name: string;
//     email: string;
//   };
// }

// export interface AdjutorKarmaResponse {
//   status: "success" | "error";
//   message: string;
//   data: AdjutorKarmaData | null;
//   meta: {
//     cost: number;
//     balance: number;
//   };
// }

export interface AdjutorKarmaData {
  karma_identity: string;
  amount_in_contention: string;
  reason: string | null;
  default_date: string | null;
  karma_type: {
    karma: string;
  };
  karma_identity_type: {
    identity_type: string;
  };
  reporting_entity: {
    name: string;
    email: string;
  };
}

export interface AdjutorKarmaResponse {
  status: "success" | "error";
  message: string;
  "mock-response"?: string;
  data: AdjutorKarmaData | null;
  meta: {
    cost: number;
    balance: number;
  };
}