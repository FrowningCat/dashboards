/**
 * Опознание товара: номер карточки, артикул продавца и название.
 *
 * Вынесено из «Артикула», потому что теперь эти три поля нужны и «Рекламе»:
 * под раскрытой кампанией перечислены участвующие товары. Держать их копией
 * в двух местах значило бы однажды переименовать товар в одном и забыть
 * в другом — на этом экране такое уже случалось с числами.
 *
 * Всё остальное — остатки, продажи, претензии, расход — остаётся на своих
 * экранах: «Реклама» не показывает склады, «Артикул» не показывает ставки.
 */

export type ArticleIdentity = {
  /** Номер карточки в Wildberries. По нему сходятся все выгрузки. */
  nmId: number;
  /** Артикул продавца — то, чем товар называют внутри компании. */
  vendorCode: string;
  name: string;
};

export const ARTICLE_IDENTITIES = {
  boots: { nmId: 226727766, vendorCode: 'ШМ-1043', name: 'Ботинки зимние, нубук' },
  sneakers: { nmId: 198340115, vendorCode: 'ШМ-0871', name: 'Кроссовки летние, сетка' },
  lowShoes: { nmId: 241009338, vendorCode: 'ШМ-1180', name: 'Полуботинки кожаные' },
} as const satisfies Record<string, ArticleIdentity>;

const BY_NM_ID = new Map<number, ArticleIdentity>(
  Object.values(ARTICLE_IDENTITIES).map((item) => [item.nmId, item]),
);

/**
 * Возвращает undefined для незнакомого номера, и это не ошибка: рекламный
 * кабинет отдаёт nmId кампании даже тогда, когда карточку уже удалили
 * из каталога. Показать такой товар нечем, кроме самого номера.
 */
export function articleIdentity(nmId: number): ArticleIdentity | undefined {
  return BY_NM_ID.get(nmId);
}
