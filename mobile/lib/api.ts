import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8000;
const TIMEOUT_MS = 10_000;

function resolveBaseUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  // В разработке адрес берём у Metro: с телефона localhost — это сам телефон,
  // а не компьютер, где крутится API.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:${API_PORT}`;
  }

  // На вебе hostUri пустой, но localhost там — та же машина, что открыла
  // страницу, так что откат осмыслен.
  if (Platform.OS === 'web') {
    return `http://localhost:${API_PORT}`;
  }

  // На телефоне localhost — сам телефон. Молчаливый откат туда выглядел бы
  // как «сервер недоступен», и причину искали бы в сети, а не в сборке.
  return null;
}

export const API_BASE_URL = resolveBaseUrl();

export type User = {
  id: number;
  login: string;
  email: string;
};

export type ApiErrorCode =
  | 'notConfigured'
  | 'unreachable'
  | 'invalidCredentials'
  | 'serverError'
  /** Отчёт есть в списке, но выгрузки под него ещё нет. */
  | 'notImplemented'
  /** Выгрузка есть, но ни разу не отрабатывала — таблица пуста. */
  | 'noData'
  /** Файл получен, но сохранить его на этом устройстве нечем. */
  | 'cannotSave';

/**
 * Несёт код, а не готовую фразу: текст ошибки собирается на экране, где
 * известен выбранный язык. Иначе сообщения остались бы русскими навсегда.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly detail?: string,
  ) {
    super(code);
  }
}

export async function signIn(identifier: string, password: string): Promise<User> {
  if (API_BASE_URL === null) {
    throw new ApiError('notConfigured');
  }

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
    throw new ApiError('unreachable');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    throw new ApiError('invalidCredentials');
  }

  if (!response.ok) {
    throw new ApiError('serverError', String(response.status));
  }

  return (await response.json()) as User;
}
