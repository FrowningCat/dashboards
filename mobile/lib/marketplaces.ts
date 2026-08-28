import type { Href } from 'expo-router';

export const MARKETPLACE_IDS = ['wb', 'ozon'] as const;

export type MarketplaceId = (typeof MARKETPLACE_IDS)[number];

/** Названия брендов не переводятся и в словарь не идут. */
export const MARKETPLACE_NAMES: Record<MarketplaceId, string> = {
  wb: 'Wildberries',
  ozon: 'Ozon',
};

/**
 * Параметр маршрута приходит строкой, и в адресе может оказаться что угодно.
 * Экран обязан отличить свой идентификатор от чужого, иначе обращение к
 * палитре по несуществующему ключу свалит рендер.
 */
export function isMarketplaceId(value: string | undefined): value is MarketplaceId {
  return value !== undefined && (MARKETPLACE_IDS as readonly string[]).includes(value);
}

export type MarketplaceTab = 'article' | 'history' | 'more';

/**
 * Адреса экранов маркетплейса. Все переходы идут отсюда, чтобы приведение
 * типа ниже жило в одном месте, а не расползлось по экранам.
 *
 * Приведение вынужденное. Генератор типизированных маршрутов в SDK 54 выдаёт
 * для index-файла внутри динамической папки литерал `/marketplace/[id]/index`,
 * которого во время выполнения не существует: такой адрес отдаёт
 * «Unmatched Route». Рабочий путь `/marketplace/[id]` в сгенерированный союз
 * при этом не попадает. Проверено вручную — открываются все четыре адреса.
 */
export function marketplaceHref(id: MarketplaceId, tab?: MarketplaceTab): Href {
  return (tab ? `/marketplace/${id}/${tab}` : `/marketplace/${id}`) as Href;
}
