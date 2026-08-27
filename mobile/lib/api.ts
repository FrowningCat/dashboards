import Constants from 'expo-constants';

const API_PORT = 8000;
const TIMEOUT_MS = 10_000;

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  // С телефона localhost — это сам телефон, а не компьютер, где крутится API.
  // Metro отдал бандл со своего адреса в локальной сети; API слушает там же.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();

export type User = {
  id: number;
  login: string;
  email: string;
};

/** Ошибка с текстом, который можно показать пользователю как есть. */
export class ApiError extends Error {}

export async function signIn(identifier: string, password: string): Promise<User> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: identifier, password }),
      signal: controller.signal,
    });
  } catch {
    // Сюда попадают и обрыв сети, и таймаут, и «сервер не запущен».
    // Адрес в тексте — чтобы не гадать, куда именно приложение стучалось.
    throw new ApiError(`Сервер недоступен: ${API_BASE_URL}`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    throw new ApiError('Неверный логин или пароль');
  }

  if (!response.ok) {
    throw new ApiError(`Сервер ответил ошибкой (${response.status})`);
  }

  return (await response.json()) as User;
}
