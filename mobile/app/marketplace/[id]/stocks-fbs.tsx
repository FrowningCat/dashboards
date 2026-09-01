import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MarketplaceShell } from '@/components/marketplace-shell';
import { Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { ARTICLE_IDENTITIES, articleIdentity } from '@/lib/articles';
import { grouped } from '@/lib/format';
import { useTranslation } from '@/lib/i18n';
import { isMarketplaceId } from '@/lib/marketplaces';

type SizeStock = {
  size: string;
  quantity: number;
};

type FbsArticle = {
  nmId: number;
  sizes: readonly SizeStock[];
};

/**
 * Заглушка. Остатки ФБС в базе не лежат: свой склад продавца отдаётся
 * отдельным методом, не тем, которым выгружаются склады Wildberries.
 *
 * Склад здесь один и всегда свой, поэтому списка складов нет — сразу товары.
 * Размеры настоящие, а не chrtId: по своему складу их знает сам продавец,
 * и сопоставление с карточками товара для этого не нужно.
 */
const FBS_WAREHOUSE = 'Склад на Ленина, 14';

const FBS_ARTICLES: readonly FbsArticle[] = [
  {
    nmId: ARTICLE_IDENTITIES.boots.nmId,
    sizes: [
      { size: '39', quantity: 12 },
      { size: '40', quantity: 21 },
      { size: '41', quantity: 26 },
      { size: '42', quantity: 18 },
      { size: '43', quantity: 9 },
      { size: '44', quantity: 4 },
    ],
  },
  {
    nmId: ARTICLE_IDENTITIES.sneakers.nmId,
    sizes: [
      { size: '40', quantity: 8 },
      { size: '41', quantity: 15 },
      { size: '42', quantity: 19 },
      { size: '43', quantity: 11 },
    ],
  },
  {
    nmId: ARTICLE_IDENTITIES.lowShoes.nmId,
    sizes: [
      { size: '40', quantity: 5 },
      { size: '41', quantity: 9 },
      { size: '42', quantity: 7 },
      { size: '43', quantity: 3 },
    ],
  },
];

function total(article: FbsArticle): number {
  return article.sizes.reduce((sum, item) => sum + item.quantity, 0);
}

export default function MarketplaceStocksFbsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [opened, setOpened] = useState<number | null>(null);

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  const onHand = FBS_ARTICLES.reduce((sum, article) => sum + total(article), 0);

  return (
    <MarketplaceShell id={id} active="more" backLabel="tabMore">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{t('stocksOnHand')}</Text>
            <Text style={styles.tileValue}>{grouped(onHand)}</Text>
            <Text style={styles.tileHint}>
              {t('totalPairs')} · {t('stocksArticleCount', { count: FBS_ARTICLES.length })}
            </Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{t('warehousesTitle')}</Text>
            <Text style={styles.tileName}>{FBS_WAREHOUSE}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('stocksArticles')}</Text>

          {FBS_ARTICLES.map((article, index) => {
            const identity = articleIdentity(article.nmId);
            const isOpen = opened === article.nmId;

            return (
              <View key={article.nmId} style={index > 0 ? styles.divided : undefined}>
                <Pressable
                  onPress={() => setOpened(isOpen ? null : article.nmId)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowName}>
                      {identity ? identity.name : t('stocksNoName')}
                    </Text>
                    <Text style={styles.rowCode}>
                      {identity ? `${identity.vendorCode} · ${article.nmId}` : article.nmId}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>{grouped(total(article))}</Text>
                  <Text style={styles.rowChevron}>{isOpen ? '⌄' : '›'}</Text>
                </Pressable>

                {isOpen ? (
                  <View style={styles.nested}>
                    {article.sizes.map((item) => (
                      <View key={item.size} style={styles.line}>
                        <Text style={styles.lineName}>
                          {t('sizeSelected', { size: item.size })}
                        </Text>
                        <Text style={styles.lineValue}>{grouped(item.quantity)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.sync}>
          <View style={styles.pulse} />
          <Text style={styles.syncText}>{t('dataUpdated', { hours: 2 })}</Text>
        </View>
      </ScrollView>
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 9,
  },
  pressed: {
    opacity: 0.85,
  },

  tiles: {
    flexDirection: 'row',
    gap: 9,
  },
  tile: {
    flex: 1,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    padding: 13,
  },
  tileLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Palette.muted,
  },
  tileValue: {
    fontFamily: Fonts.mono,
    fontSize: 19,
    fontWeight: '600',
    color: Palette.ink,
    marginTop: 5,
  },
  tileName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: Palette.ink,
    marginTop: 5,
  },
  tileHint: {
    fontSize: 10.5,
    color: Palette.muted,
    marginTop: 3,
  },

  card: {
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    padding: 15,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Palette.muted,
    marginBottom: 2,
  },

  divided: {
    borderTopWidth: 1,
    borderTopColor: Palette.field,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 13,
    color: Palette.ink,
  },
  rowCode: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    color: Palette.muted,
    marginTop: 1,
  },
  rowValue: {
    fontFamily: Fonts.mono,
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.ink,
  },
  rowChevron: {
    fontSize: 14,
    color: Palette.dim,
  },

  nested: {
    borderLeftWidth: 2,
    borderLeftColor: Palette.field,
    paddingLeft: 11,
    marginBottom: 6,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 9,
    paddingVertical: 5,
  },
  lineName: {
    fontSize: 12.5,
    color: Palette.muted,
  },
  lineValue: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.ink,
  },

  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.ok,
  },
  syncText: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Palette.muted,
  },
});
