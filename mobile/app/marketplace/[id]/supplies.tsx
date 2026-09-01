import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MarketplaceShell } from '@/components/marketplace-shell';
import { Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { ARTICLE_IDENTITIES, articleIdentity } from '@/lib/articles';
import { formatDate, shiftDays, startOfDay } from '@/lib/dates';
import { grouped } from '@/lib/format';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { isMarketplaceId } from '@/lib/marketplaces';

const PERIODS = ['week', 'month', 'quarter'] as const;

type Period = (typeof PERIODS)[number];

const PERIOD_LABELS: Record<Period, TranslationKey> = {
  week: 'periodWeek',
  month: 'periodMonth',
  quarter: 'periodQuarter',
};

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, quarter: 90 };

type SupplyItem = {
  nmId: number;
  quantity: number;
};

type Supply = {
  /** Номер поставки в кабинете Wildberries. */
  number: string;
  /**
   * Дней от сегодня: отрицательное — уже приняли, положительное — ждём.
   *
   * Одним полем, а не двумя списками: поставка не меняет природы, когда
   * её принимают, — меняется только дата относительно сегодняшней.
   */
  offset: number;
  warehouse: string;
  items: readonly SupplyItem[];
};

/**
 * Заглушка. Поставок в базе нет: их отдаёт метод supplies статистики
 * Wildberries, а выгрузки под него ещё не написано. Форма повторяет ответ
 * API, поэтому переход на живые данные сведётся к замене константы
 * на загрузку.
 *
 * Количество не хранится отдельным полем: оно складывается из состава —
 * так строка поставки и её раскрытие не могут разойтись.
 */
const SUPPLIES: readonly Supply[] = [
  {
    number: 'WB-GI-14859772',
    offset: 11,
    warehouse: 'Казань',
    items: [
      { nmId: ARTICLE_IDENTITIES.boots.nmId, quantity: 200 },
      { nmId: ARTICLE_IDENTITIES.sneakers.nmId, quantity: 120 },
    ],
  },
  {
    number: 'WB-GI-14851203',
    offset: 4,
    warehouse: 'Коледино',
    items: [{ nmId: ARTICLE_IDENTITIES.boots.nmId, quantity: 480 }],
  },
  {
    number: 'WB-GI-14820391',
    offset: -3,
    warehouse: 'Коледино',
    items: [
      { nmId: ARTICLE_IDENTITIES.boots.nmId, quantity: 420 },
      { nmId: ARTICLE_IDENTITIES.lowShoes.nmId, quantity: 180 },
    ],
  },
  {
    number: 'WB-GI-14796104',
    offset: -9,
    warehouse: 'Электросталь',
    items: [{ nmId: ARTICLE_IDENTITIES.sneakers.nmId, quantity: 610 }],
  },
  {
    number: 'WB-GI-14771658',
    offset: -16,
    warehouse: 'Казань',
    items: [
      { nmId: ARTICLE_IDENTITIES.boots.nmId, quantity: 240 },
      { nmId: ARTICLE_IDENTITIES.sneakers.nmId, quantity: 195 },
      { nmId: ARTICLE_IDENTITIES.lowShoes.nmId, quantity: 130 },
    ],
  },
  {
    number: 'WB-GI-14740223',
    offset: -27,
    warehouse: 'Коледино',
    items: [{ nmId: ARTICLE_IDENTITIES.boots.nmId, quantity: 780 }],
  },
  {
    number: 'WB-GI-14688915',
    offset: -44,
    warehouse: 'Тула',
    items: [
      { nmId: ARTICLE_IDENTITIES.lowShoes.nmId, quantity: 355 },
      { nmId: ARTICLE_IDENTITIES.sneakers.nmId, quantity: 290 },
    ],
  },
  {
    number: 'WB-GI-14602477',
    offset: -71,
    warehouse: 'Электросталь',
    items: [{ nmId: ARTICLE_IDENTITIES.boots.nmId, quantity: 520 }],
  },
];

function pairs(supply: Supply): number {
  return supply.items.reduce((sum, item) => sum + item.quantity, 0);
}

function totalPairs(list: readonly Supply[]): number {
  return list.reduce((sum, supply) => sum + pairs(supply), 0);
}

export default function MarketplaceSuppliesScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [period, setPeriod] = useState<Period>('month');
  const [opened, setOpened] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  const days = PERIOD_DAYS[period];

  // Планируемые периодом не режутся: он задаёт, как далеко смотреть назад,
  // а ждём мы всё, что назначено, независимо от выбранного окна.
  const planned = SUPPLIES.filter((supply) => supply.offset > 0).sort(
    (a, b) => a.offset - b.offset,
  );
  const accepted = SUPPLIES.filter(
    (supply) => supply.offset < 0 && -supply.offset < days,
  ).sort((a, b) => b.offset - a.offset);

  const renderList = (list: readonly Supply[]) =>
    list.map((supply, index) => {
      const isOpen = opened === supply.number;
      const date = shiftDays(today, supply.offset);

      return (
        <View key={supply.number} style={index > 0 ? styles.divided : undefined}>
          <Pressable
            onPress={() => setOpened(isOpen ? null : supply.number)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowTexts}>
              <Text style={styles.rowName}>
                {formatDate(date)} · {supply.warehouse}
              </Text>
              <Text style={styles.rowCode}>{supply.number}</Text>
            </View>
            <Text style={styles.rowValue}>{grouped(pairs(supply))}</Text>
            <Text style={styles.rowChevron}>{isOpen ? '⌄' : '›'}</Text>
          </Pressable>

          {isOpen ? (
            <View style={styles.nested}>
              {supply.items.map((item) => {
                const identity = articleIdentity(item.nmId);
                return (
                  <View key={item.nmId} style={styles.line}>
                    <View style={styles.lineTexts}>
                      <Text style={styles.lineName}>
                        {identity ? identity.name : t('stocksNoName')}
                      </Text>
                      <Text style={styles.lineCode}>
                        {identity ? `${identity.vendorCode} · ${item.nmId}` : item.nmId}
                      </Text>
                    </View>
                    <Text style={styles.lineValue}>{grouped(item.quantity)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      );
    });

  return (
    <MarketplaceShell id={id} active="more" backLabel="tabMore">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ожидаемое стоит выше принятого: по нему ещё можно что-то решить,
            а принятое остаётся только смотреть. */}
        {planned.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.label}>{t('suppliesPlanned')}</Text>
              <Text style={styles.summary}>
                {t('suppliesSummary', {
                  count: planned.length,
                  pairs: grouped(totalPairs(planned)),
                })}
              </Text>
            </View>

            {renderList(planned)}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={[styles.label, styles.labelSpaced]}>{t('suppliesAccepted')}</Text>

          {/* Переключатель внутри карточки, а не над обеими: он относится
              только к принятым — будущее периодом не ограничивают. */}
          <View style={styles.segments}>
            {PERIODS.map((key) => {
              const active = key === period;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setPeriod(key);
                    setOpened(null);
                  }}
                  style={[styles.segment, active && styles.segmentActive]}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {t(PERIOD_LABELS[key])}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.basisRow}>
            <Text style={styles.basis}>
              {t('periodPlain', {
                from: formatDate(shiftDays(today, -(days - 1))),
                to: formatDate(today),
              })}
            </Text>
            <Text style={styles.summary}>
              {t('suppliesSummary', {
                count: accepted.length,
                pairs: grouped(totalPairs(accepted)),
              })}
            </Text>
          </View>

          {accepted.length === 0 ? (
            <Text style={styles.empty}>{t('suppliesNone')}</Text>
          ) : null}

          {renderList(accepted)}
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

  card: {
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    padding: 15,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Palette.muted,
  },
  labelSpaced: {
    marginBottom: 9,
  },
  summary: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    color: Palette.dim,
  },

  segments: {
    flexDirection: 'row',
    gap: 5,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: Palette.field,
  },
  segmentActive: {
    backgroundColor: Palette.ink,
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Palette.muted,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: Palette.paper,
  },

  basisRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 9,
    marginBottom: 2,
  },
  basis: {
    fontSize: 11,
    lineHeight: 15,
    color: Palette.muted,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    paddingVertical: 5,
  },
  lineTexts: {
    flex: 1,
    minWidth: 0,
  },
  lineName: {
    fontSize: 12.5,
    color: Palette.ink,
  },
  lineCode: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Palette.dim,
    marginTop: 1,
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
