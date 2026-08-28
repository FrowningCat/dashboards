import { Stack } from 'expo-router';

/**
 * Экраны маркетплейса — собственный стек.
 *
 * Без него каждый файл пришлось бы объявлять в корневом layout по отдельности,
 * а объявление `marketplace/[id]/index` конфликтует с маршрутом, который
 * expo-router выводит из того же файла сам: два экрана на один путь.
 */
export default function MarketplaceLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
