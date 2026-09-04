export interface SignupDTO {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: number;
  email: string;
}

export interface AuthResult {
  user: Record<string, unknown>;
  token: string;
}