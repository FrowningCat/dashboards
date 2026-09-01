import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/language-switch';
import { AdsIcon, ArticleIcon, HistoryIcon, MoreIcon } from '@/components/tab-icons';
import { Brand, Palette, Radius } from '@/constants/design';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { marketplaceHref, type MarketplaceId, type MarketplaceTab } from '@/lib/marketplaces';

export type TabKey = 'article' | 'history' | 'ads' | 'more';

type Tab = {
  key: TabKey;
  Icon: (props: { color: string }) => React.ReactElement;
  label: TranslationKey;
  tab: MarketplaceTab;
};

const TABS: readonly Tab[] = [
  { key: 'article', Icon: ArticleIcon, label: 'tabArticle', tab: 'article' },
  { key: 'history', Icon: HistoryIcon, label: 'tabHistory', tab: 'history' },
  { key: 'ads', Icon: AdsIcon, label: 'tabAds', tab: 'ads' },
  { key: 'more', Icon: MoreIcon, label: 'tabMore', tab: 'more' },
];

type Props = {
  id: MarketplaceId;
  active: TabKey;
  children: ReactNode;
  /**
   * Возврат к выбору маркетплейса. Скрывается, когда экран показывает
   * что-то вложенное со своим возвратом: две кнопки «назад», ведущие
   * в разные места, читаются как одна и та же.
   */
  showBack?: boolean;
  /**
   * Куда ведёт возврат — словом, а не одной стрелкой. Экраны, открытые из
   * «Ещё», лежат глубже вкладок, и «Назад» на них не говорит, куда именно.
   */
  backLabel?: TranslationKey;
};

/**
 * Общая обвязка экранов маркетплейса: шапка с возвратом и языком, тело,
 * нижние вкладки в цвет маркетплейса.
 *
 * Вкладки переключаются через replace, а не push: иначе хождение между
 * ними накапливало бы в стеке десяток экранов, и «назад» пришлось бы
 * нажимать столько же раз.
 */
export function MarketplaceShell({
  id,
  active,
  children,
  showBack = true,
  backLabel = 'back',
}: Props) {
  const { t } = useTranslation();
  const accent = Brand[id].accent;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.topBar, !showBack && styles.topBarEnd]}>
        {showBack ? (
          <Pressable
            // Экран может быть открыт по прямой ссылке — тогда возвращаться
            // некуда, и уходим к выбору маркетплейса.
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/marketplaces'))}
            hitSlop={8}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backText}>{t(backLabel)}</Text>
          </Pressable>
        ) : null}

        <LanguageSwitch />
      </View>

      <View style={styles.body}>{children}</View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const current = tab.key === active;
          const color = current ? accent : Palette.dim;
          return (
            <Pressable
              key={tab.key}
              disabled={current}
              onPress={() => router.replace(marketplaceHref(id, tab.tab))}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
              <View style={styles.tabIcon}>
                <tab.Icon color={color} />
              </View>
              <Text style={[styles.tabLabel, { color }]}>{t(tab.label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.appBg,
  },
  body: {
    flex: 1,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  topBarEnd: {
    // Без кнопки возврата space-between утащил бы переключатель влево.
    justifyContent: 'flex-end',
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

  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    backgroundColor: Palette.paper,
    paddingTop: 9,
    paddingBottom: 15,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabPressed: {
    opacity: 0.6,
  },
  tabIcon: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '500',
  },
});
