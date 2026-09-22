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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('mypass_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseOkBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new ApiError(response.status, await parseErrorMessage(response));
  return parseOkBody<T>(response);
}

export async function apiJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError(response.status, await parseErrorMessage(response));
  return parseOkBody<T>(response);
}

export async function apiForm<T>(method: string, path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!response.ok) throw new ApiError(response.status, await parseErrorMessage(response));
  return parseOkBody<T>(response);
}

export { BASE_URL };
