/**
 * Работа с датами на уровне суток. Часов в данных нет: и продажи, и остатки
 * приходят с точностью до дня.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Короткая форма без года: на графике и в шапке год один и тот же. */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
