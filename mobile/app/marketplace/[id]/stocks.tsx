import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MarketplaceShell } from '@/components/marketplace-shell';
import { Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { articleIdentity } from '@/lib/articles';
import { grouped } from '@/lib/format';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { isMarketplaceId } from '@/lib/marketplaces';
import { fetchStocks, fetchStockSizes, type StockSize, type Stocks } from '@/lib/stocks';

/**
 * Сколько строк рисуем без поиска.
 *
 * Артикулов больше четырёх тысяч, и ScrollView отрисовывает всё сразу —
 * полный список подвесил бы экран на пару секунд. Показываем начало
 * списка, отсортированного по остатку, а остальное ищется полем.
 * Сколько строк осталось за кадром, написано на экране: молчаливое
 * усечение читалось бы как «это все артикулы».
 */
const VISIBLE_LIMIT = 40;

const ERROR_MESSAGES: Record<string, TranslationKey> = {
  notConfigured: 'errorNotConfigured',
  unreachable: 'errorUnreachable',
  serverError: 'errorServer',
  noData: 'errorNoData',
};

/** «2026-08-28» → «28.08». Год не нужен: снимок всегда свежий. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return month && day ? `${day}.${month}` : iso;
}

export default function MarketplaceStocksScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<Stocks | null>(null);
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [needle, setNeedle] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [opened, setOpened] = useState<number | null>(null);
  // Размеры подгружаются по одному артикулу и остаются в памяти: свернуть
  // и снова развернуть строку не должно стоить ещё одного запроса.
  const [sizes, setSizes] = useState<Record<number, readonly StockSize[]>>({});

  const load = useCallback(async () => {
    setFailure(null);
    setData(null);
    try {
      setData(await fetchStocks());
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'serverError';
      setFailure(ERROR_MESSAGES[code] ?? 'errorUnknown');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  const toggle = async (nmId: number) => {
    if (opened === nmId) {
      setOpened(null);
      return;
    }

    setOpened(nmId);
    if (sizes[nmId]) {
      return;
    }

    try {
      const loaded = await fetchStockSizes(nmId);
      setSizes((current) => ({ ...current, [nmId]: loaded }));
    } catch {
      // Раскрытая строка останется без размеров. Ронять весь экран из-за
      // одного артикула не стоит: остальные показываются верно.
      setSizes((current) => ({ ...current, [nmId]: [] }));
    }
  };

  const query = needle.trim();
  const matched = data
    ? query
      ? data.articles.filter((item) => {
          const identity = articleIdentity(item.nmId);
          return (
            String(item.nmId).includes(query) ||
            identity?.vendorCode.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
            identity?.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
          );
        })
      : data.articles
    : [];
  const visible = matched.slice(0, VISIBLE_LIMIT);
  const hidden = matched.length - visible.length;

  return (
    <MarketplaceShell id={id} active="more" backLabel="tabMore">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {failure ? (
          <View style={styles.card}>
            <Text style={styles.failed}>{t(failure)}</Text>
            <Pressable
              onPress={load}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
              <Text style={styles.retryText}>{t('retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!data && !failure ? (
          <View style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator size="small" color={Palette.muted} />
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : null}

        {data ? (
          <>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>{t('stocksOnHand')}</Text>
                <Text style={styles.tileValue}>{grouped(data.totals.quantity)}</Text>
                <Text style={styles.tileHint}>
                  {t('totalPairs')} · {t('stocksArticleCount', {
                    count: grouped(data.totals.articles),
                  })}
                </Text>
              </View>

              <View style={styles.tile}>
                <Text style={styles.tileLabel}>{t('stocksInWay')}</Text>
                <Text style={styles.tileValue}>
                  {grouped(data.totals.toClient + data.totals.fromClient)}
                </Text>
                <Text style={styles.tileHint}>{t('stocksBothWays')}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{t('stocksArticles')}</Text>

              <TextInput
                style={[styles.filter, searchFocused && styles.filterFocused]}
                value={needle}
                onChangeText={(next) => {
                  setNeedle(next);
                  setOpened(null);
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={t('stocksSearch')}
                placeholderTextColor={Palette.dim}
                autoCorrect={false}
                keyboardType="default"
              />

              {matched.length === 0 ? (
                <Text style={styles.empty}>{t('stocksNothing')}</Text>
              ) : null}

              {visible.map((item, index) => {
                const identity = articleIdentity(item.nmId);
                const isOpen = opened === item.nmId;
                const loaded = sizes[item.nmId];

                return (
                  <View key={item.nmId} style={index > 0 ? styles.divided : undefined}>
                    <Pressable
                      onPress={() => toggle(item.nmId)}
                      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                      <View style={styles.rowTexts}>
                        {/* Имени у большинства артикулов нет: выгрузка
                            карточек товара ещё не написана, и в базе лежит
                            только номер. */}
                        <Text style={[styles.rowName, !identity && styles.rowNameUnknown]}>
                          {identity ? identity.name : t('stocksNoName')}
                        </Text>
                        <Text style={styles.rowCode}>
                          {identity ? `${identity.vendorCode} · ${item.nmId}` : item.nmId}
                        </Text>
                      </View>
                      <Text style={styles.rowValue}>{grouped(item.quantity)}</Text>
                      <Text style={styles.rowChevron}>{isOpen ? '⌄' : '›'}</Text>
                    </Pressable>

                    {isOpen ? (
                      <View style={styles.nested}>
                        {loaded === undefined ? (
                          <ActivityIndicator size="small" color={Palette.dim} />
                        ) : null}

                        {loaded?.map((size) => (
                          <View key={size.chrtId} style={styles.line}>
                            <Text style={styles.lineName}>
                              {t('stocksSizeCode', { code: size.chrtId })}
                            </Text>
                            <Text style={styles.lineValue}>{grouped(size.quantity)}</Text>
                          </View>
                        ))}

                        <View style={[styles.line, styles.lineDivided]}>
                          <Text style={styles.lineName}>{t('inWayToClient')}</Text>
                          <Text style={styles.lineValueMuted}>{grouped(item.toClient)}</Text>
                        </View>
                        <View style={styles.line}>
                          <Text style={styles.lineName}>{t('inWayFromClient')}</Text>
                          <Text style={styles.lineValueMuted}>{grouped(item.fromClient)}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {hidden > 0 ? (
                <Text style={styles.more}>{t('stocksHidden', { count: grouped(hidden) })}</Text>
              ) : null}
            </View>

            <View style={styles.sync}>
              <View style={styles.pulse} />
              <Text style={styles.syncText}>
                {t('stocksAsOf', { date: shortDate(data.stockDate) })}
              </Text>
            </View>
          </>
        ) : null}
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
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: Palette.muted,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Palette.muted,
  },

  filter: {
    backgroundColor: Palette.field,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 11,
    fontSize: 13,
    color: Palette.ink,
    marginTop: 9,
    marginBottom: 2,
  },
  filterFocused: {
    borderColor: Palette.line,
    backgroundColor: Palette.paper,
  },
  empty: {
    fontSize: 12.5,
    color: Palette.dim,
    paddingVertical: 9,
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
  rowNameUnknown: {
    color: Palette.dim,
    fontStyle: 'italic',
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
  lineDivided: {
    borderTopWidth: 1,
    borderTopColor: Palette.field,
    marginTop: 3,
    paddingTop: 8,
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
  lineValueMuted: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    color: Palette.muted,
  },

  more: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Palette.dim,
    marginTop: 10,
  },

  failed: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Palette.warn,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 11,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.control,
    backgroundColor: Palette.ink,
  },
  retryText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.paper,
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
