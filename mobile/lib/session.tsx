import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { signOut as revoke, type Session } from '@/lib/api';

/**
 * Текущая сессия.
 *
 * Токен держится только в памяти и умирает вместе с приложением: закрыл —
 * входишь заново. Записать его на диск было бы удобнее, но единственное
 * хранилище, которое сейчас подключено, — AsyncStorage, а он кладёт значения
 * открытым текстом рядом с настройкой языка. Пропуск к дашборду там лежать
 * не должен.
 *
 * Чтобы вход переживал перезапуск, нужен expo-secure-store: Keychain на iOS
 * и EncryptedSharedPreferences на Android. Это отдельный шаг, и до него
 * поведение остаётся таким.
 */

type SessionValue = {
  session: Session | null;
  signedIn: boolean;
  remember: (session: Session) => void;
  forget: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const remember = useCallback((next: Session) => setSession(next), []);

  const forget = useCallback(() => {
    setSession((current) => {
      if (current) {
        // Не ждём ответа: приложение выходит сразу, а сервер закрывает
        // сессию своим чередом. Обратное означало бы, что при недоступном
        // сервере из аккаунта не выйти.
        void revoke(current.token);
      }
      return null;
    });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ session, signedIn: session !== null, remember, forget }),
    [session, remember, forget],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession вызван вне SessionProvider');
  }
  return value;
}

/**
 * Заголовок для защищённых запросов.
 *
 * Пока эндпоинты открыты и никто его не шлёт — закрытие /stocks и /reports
 * это следующий шаг. Функция лежит здесь, чтобы формат заголовка был описан
 * в одном месте, а не переписывался в каждом запросе.
 */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
