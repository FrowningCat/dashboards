import { Redirect } from 'expo-router';

/**
 * Точка входа приложения.
 *
 * Пока сессии нет — всегда на форму входа. Когда появится токен, здесь будет
 * развилка: есть действующая сессия — сразу к выбору маркетплейса, нет —
 * на вход.
 */
export default function Index() {
  return <Redirect href="/login" />;
}
