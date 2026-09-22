const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return '요청 처리 중 오류가 발생했어요.';
  try {
    const data = JSON.parse(text);
    return data.message ?? data.error ?? text;
  } catch {
    return text;
  }
}

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

export async function signup(payload: SignupPayload): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }
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
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  return response.json();
}
