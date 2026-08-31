import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/language-switch';
import { Brand, Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { MARKETPLACE_NAMES, marketplaceHref, type MarketplaceId } from '@/lib/marketplaces';

type Marketplace = {
  id: MarketplaceId;
  gradient: readonly [string, string];
  articles: string;
  stock: string;
  sold: string;
  revenue: string;
};

/**
 * Числа взяты из макета и пока не настоящие: эндпоинта со сводкой ещё нет.
 * Форма совпадает с тем, что вернёт API, поэтому подмена на запрос сведётся
 * к замене этой константы на загрузку.
 */
const MARKETPLACES: readonly Marketplace[] = [
  {
    id: 'wb',
    gradient: Brand.wb.gradient,
    articles: '1 138',
    // Те же числа, что показывает «История»: одна и та же величина не должна
    // отличаться от экрана к экрану.
    stock: '50 575',
    sold: '2 772',
    revenue: '4,0 млн',
  },
];

export default function MarketplacesScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        {/* Не router.back(): вход попадает сюда через replace, своего экрана
            в стеке уже нет, и системный «назад» ушёл бы не туда. */}
        <Pressable
          onPress={() => router.replace('/login')}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>{t('back')}</Text>
        </Pressable>

        <LanguageSwitch />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {MARKETPLACES.map((marketplace) => (
          <Pressable
            key={marketplace.id}
            onPress={() => router.push(marketplaceHref(marketplace.id))}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <LinearGradient
              colors={marketplace.gradient}
              // 135deg из макета — это из левого верхнего угла в правый нижний.
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}>
              <Text style={styles.chevron}>›</Text>

              <Text style={styles.name}>{MARKETPLACE_NAMES[marketplace.id]}</Text>
              <Text style={styles.meta}>{t('articles', { count: marketplace.articles })}</Text>

              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{marketplace.stock}</Text>
                  <Text style={styles.statLabel}>{t('cardStock')}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{marketplace.sold}</Text>
                  <Text style={styles.statLabel}>{t('cardSold')}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{marketplace.revenue}</Text>
                  <Text style={styles.statLabel}>{t('cardRevenue')}</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.appBg,
  },
  content: {
    paddingHorizontal: 18,
    // Заголовка у экрана нет: раньше здесь стоял отступ 22, чтобы карточка
    // не липла к статус-бару, теперь это место занимает кнопка возврата.
    paddingTop: 14,
    paddingBottom: 22,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Palette.field,
    borderRadius: Radius.control,
  },
  backPressed: {
    opacity: 0.7,
  },
  backChevron: {
    fontSize: 15,
    lineHeight: 17,
    color: Palette.muted,
  },
  backText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.muted,
  },

  card: {
    borderRadius: Radius.card,
    // Градиент внутри прямоугольный, скругление задаёт обёртка.
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.9,
  },
  gradient: {
    padding: 18,
  },

  chevron: {
    position: 'absolute',
    right: 16,
    top: 18,
    fontSize: 17,
    color: Palette.paper,
    opacity: 0.6,
  },

  name: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.19,
    color: Palette.paper,
  },
  meta: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    fontWeight: '500',
    color: Palette.paper,
    opacity: 0.82,
    marginTop: 5,
  },

  stats: {
    flexDirection: 'row',
    // Зазор и кегль подписи подобраны так, чтобы «продано, 30 дней»
    // укладывалось в строку даже на 320 пикселях: иначе одна колонка
    // переносится, а две соседние — нет, и ряд выглядит неровным.
    gap: 10,
    marginTop: 16,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontFamily: Fonts.mono,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.34,
    color: Palette.paper,
  },
  statLabel: {
    fontSize: 9,
    color: Palette.paper,
    opacity: 0.78,
    marginTop: 2,
  },
});
