import { Redirect, useLocalSearchParams } from 'expo-router';

import { isMarketplaceId, marketplaceHref } from '@/lib/marketplaces';

/**
 * Своего содержимого у корня маркетплейса нет: экран с плитками разделов
 * был временным меню, и его пункты стали вкладками.
 *
 * Адрес оставлен рабочим намеренно — на него ведут внешние ссылки и возврат
 * из вложенных экранов, а несуществующий маршрут отдал бы «страница не найдена».
 */
export default function MarketplaceIndex() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  return <Redirect href={marketplaceHref(id, 'article')} />;
}
