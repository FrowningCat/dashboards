import { API_BASE_URL, ApiError } from '@/lib/api';

/**
 * Остатки на складах Wildberries — единственный экран, который уже читает
 * настоящую базу, а не заглушку.
 *
 * Разбивки по складам нет, и это свойство данных, а не упущение: метод,
 * которым остатки выгружаются, возвращает всё под одним синтетическим
 * складом. Разрез идёт по артикулам, а внутри артикула — по размерам.
 */

const TIMEOUT_MS = 20_000;

export type StockArticle = {
  nmId: number;
  quantity: number;
  toClient: number;
  fromClient: number;
};

export type StockTotals = {
  quantity: number;
  toClient: number;
  fromClient: number;
  articles: number;
};

export type Stocks = {
  /** Дата снимка в виде ГГГГ-ММ-ДД. */
  stockDate: string;
  totals: StockTotals;
  articles: readonly StockArticle[];
};

export type StockSize = {
  /**
   * Номер размера в Wildberries, а не сам размер. Показывать «41» вместо
   * него будет нечем, пока нет выгрузки карточек товара.
   */
  chrtId: number;
  quantity: number;
  toClient: number;
  fromClient: number;
};

async function request<T>(path: string): Promise<T> {
  if (API_BASE_URL === null) {
    throw new ApiError('notConfigured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
  } catch {
    throw new ApiError('unreachable');
  } finally {
    clearTimeout(timer);
  }

  // 409 отвечает выгрузка, которая ещё ни разу не отрабатывала. Это не сбой,
  // и «сервер ответил ошибкой» увело бы искать поломку не туда.
  if (response.status === 409) {
    throw new ApiError('noData');
  }

  if (!response.ok) {
    throw new ApiError('serverError', String(response.status));
  }

  return (await response.json()) as T;
}

export function fetchStocks(): Promise<Stocks> {
  return request<Stocks>('/stocks');
}

export async function fetchStockSizes(nmId: number): Promise<readonly StockSize[]> {
  const body = await request<{ nmId: number; sizes: StockSize[] }>(`/stocks/${nmId}`);
  return body.sizes;
}
