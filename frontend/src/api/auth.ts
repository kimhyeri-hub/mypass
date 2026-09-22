import { apiJson, ApiError } from './client';

export { ApiError };

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

export async function signup(payload: SignupPayload): Promise<void> {
  await apiJson<void>('POST', '/api/auth/signup', payload);
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  email: string;
  name: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiJson<LoginResponse>('POST', '/api/auth/login', payload);
}
