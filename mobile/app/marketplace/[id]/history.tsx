import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { MarketplaceShell } from '@/components/marketplace-shell';
import { Brand, Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { formatDate, shiftDays, startOfDay } from '@/lib/dates';
import { grouped } from '@/lib/format';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { isMarketplaceId } from '@/lib/marketplaces';

const PERIODS = ['day', 'week', 'month', 'quarter'] as const;

type Period = (typeof PERIODS)[number];

const PERIOD_LABELS: Record<Period, TranslationKey> = {
  day: 'periodDay',
  week: 'periodWeek',
  month: 'periodMonth',
  quarter: 'periodQuarter',
};

/**
 * Сколько дней охватывает период, сколько столбиков рисуем и какой у столбика
 * шаг в днях.
 *
 * У одного дня столбиков четырнадцать: почасовых данных нет, а один столбик
 * графиком не назовёшь. Плитки показывают выбранный день, график — как он
 * смотрится рядом с соседними.
 */
const PERIOD_SHAPE: Record<Period, { days: number; points: number; step: number }> = {
  day: { days: 1, points: 14, step: 1 },
  week: { days: 7, points: 7, step: 1 },
  month: { days: 30, points: 30, step: 1 },
  // На 90 днях столбики стали бы по три пикселя, поэтому группируем в недели.
  quarter: { days: 90, points: 13, step: 7 },
};

const PERIOD_SCALE: Record<Period, number> = {
  day: 0.145,
  week: 1,
  month: 4.2,
  quarter: 13,
};

/**
 * Порядок — воронка: увидели, нажали, заказали, выкупили, заплатили.
 * Дальше следствия: вернули, пожаловались, осталось на складе.
 */
const METRICS = [
  'views',
  'clicks',
  'orders',
  'sales',
  'revenue',
  'returns',
  'claims',
  'stock',
] as const;

type MetricKey = (typeof METRICS)[number];

const METRIC_LABELS: Record<MetricKey, TranslationKey> = {
  views: 'metricViews',
  clicks: 'metricClicks',
  orders: 'metricOrders',
  sales: 'sold',
  revenue: 'metricRevenue',
  returns: 'metricReturns',
  claims: 'claimsTitle',
  stock: 'metricStock',
};

type Metric = {
  value: number;
  /** Изменение к предыдущему такому же периоду. */
  delta: number;
  /** Проценты или штуки: у претензий доля мало о чём говорит. */
  deltaKind: 'percent' | 'absolute';
  /** Рост претензий — плохо, рост продаж — хорошо. Выводить из знака нельзя. */
  good: boolean;
  unit: TranslationKey | null;
  series: readonly number[];
};

/**
 * Детерминированный ряд для заглушки: одинаковый при каждом рендере,
 * но с живой формой. Math.random дал бы новую картинку на каждый кадр.
 */
function series(seed: number, points: number, base: number, swing: number): number[] {
  const out: number[] = [];
  let value = base;
  let state = seed;

  for (let i = 0; i < points; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    value = Math.max(1, Math.round(value + (state / 2147483648 - 0.48) * swing));
    out.push(value);
  }

  return out;
}

type Snapshot = {
  metrics: Record<MetricKey, Metric>;
};

/**
 * Заглушка. Форма повторяет то, что вернёт API.
 *
 * По продажам и претензиям история в базе уже есть — там строки с датами.
 * По остаткам её нет: они хранятся снимками на дату, а выгрузка ещё ни разу
 * не отрабатывала. Кривая остатков начнёт заполняться с первого запуска.
 */
function snapshot(period: Period): Snapshot {
  const { points } = PERIOD_SHAPE[period];
  const scale = PERIOD_SCALE[period];
  const seed = 7 + points;

  // Дельта не одна на все периоды: на неделе и на квартале движение разное,
  // а одинаковый процент выдал бы заглушку с головой.
  const drift = period === 'week' ? 0 : period === 'month' ? 1 : period === 'quarter' ? -3 : 2;
  const claimsValue = Math.max(1, Math.round(8 * scale));

  // Числа заглушки согласованы как воронка: показов больше нажатий,
  // нажатий больше заказов, выкупов меньше заказов. Иначе экран сам себе
  // противоречит, и доверия к нему нет даже на макете.
  const metrics: Record<MetricKey, Metric> = {
    views: {
      value: Math.round(100_000 * scale),
      delta: 9 + drift,
      deltaKind: 'percent',
      good: true,
      unit: null,
      series: series(seed + 4, points, 14_300, 4_000),
    },
    clicks: {
      value: Math.round(8_000 * scale),
      delta: 14 + drift,
      deltaKind: 'percent',
      good: true,
      unit: null,
      series: series(seed + 5, points, 1_140, 350),
    },
    orders: {
      value: Math.round(780 * scale),
      delta: 11 + drift,
      deltaKind: 'percent',
      good: true,
      unit: 'totalPairs',
      series: series(seed + 6, points, 112, 42),
    },
    returns: {
      value: Math.round(45 * scale),
      delta: 3 + drift,
      deltaKind: 'percent',
      good: false,
      unit: 'totalPairs',
      series: series(seed + 7, points, 7, 5),
    },
    sales: {
      value: Math.round(660 * scale),
      delta: 12 + drift,
      deltaKind: 'percent',
      good: true,
      unit: 'totalPairs',
      series: series(seed, points, 95, 40),
    },
    revenue: {
      value: Math.round(960_000 * scale),
      delta: 8 + drift,
      deltaKind: 'percent',
      good: true,
      unit: 'currencyRuble',
      series: series(seed + 1, points, 138_000, 55_000),
    },
    stock: {
      value: 50_575,
      delta: -4 - (period === 'quarter' ? 3 : 0),
      deltaKind: 'percent',
      good: false,
      unit: 'totalPairs',
      series: series(seed + 2, points, 52_000, 900),
    },
    claims: {
      value: claimsValue,
      // Претензии считаем в штуках: доля от четырёх до одиннадцати дала бы
      // «+175 %» и пугала бы сильнее, чем стоит.
      delta: Math.max(1, Math.round(claimsValue * 0.25)),
      deltaKind: 'absolute',
      good: false,
      unit: null,
      series: series(seed + 3, points, 2, 3),
    },
  };

  return { metrics };
}

const CHART_HEIGHT = 56;
const BAR_MIN_HEIGHT = 3;

/**
 * Значение за предыдущий период. Считается из текущего и дельты, а не хранится
 * рядом: так «было» и процент не разъедутся, если поправить одно из них.
 */
function previousValue(metric: Metric): number {
  if (metric.deltaKind === 'absolute') {
    return metric.value - metric.delta;
  }
  return Math.round(metric.value / (1 + metric.delta / 100));
}

function formatDelta(metric: Metric): string {
  const sign = metric.delta > 0 ? '+' : metric.delta < 0 ? '−' : '';
  const size = Math.abs(metric.delta);
  return metric.deltaKind === 'percent' ? `${sign}${size} %` : `${sign}${size}`;
}

export default function MarketplaceHistoryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [period, setPeriod] = useState<Period>('month');
  const [metric, setMetric] = useState<MetricKey>('sales');
  const [endDate, setEndDate] = useState(() => startOfDay(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickedBar, setPickedBar] = useState<number | null>(null);

  const data = useMemo(
    () => (isMarketplaceId(id) ? snapshot(period) : null),
    [id, period],
  );

  if (!isMarketplaceId(id) || !data) {
    return <Redirect href="/marketplaces" />;
  }

  const accent = Brand[id].accent;
  const shape = PERIOD_SHAPE[period];
  const current = data.metrics[metric];
  const peak = Math.max(...current.series, 1);

  /** Дата, которой соответствует столбик. У квартала шаг — неделя. */
  const barDate = (index: number) =>
    shiftDays(endDate, -(shape.points - 1 - index) * shape.step);

  const picked =
    pickedBar === null
      ? null
      : { date: barDate(pickedBar), value: current.series[pickedBar] };

  return (
    <MarketplaceShell id={id} active="history">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.segments}>
          {PERIODS.map((key) => {
            const active = key === period;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setPeriod(key);
                  setPickedBar(null);
                }}
                style={[styles.segment, active && styles.segmentActive]}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t(PERIOD_LABELS[key])}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Даты названы явно: «за 30 дней» само по себе не говорит, какие
            именно тридцать и с чем их сравнивают. */}
        <Pressable
          onPress={() => setCalendarOpen(!calendarOpen)}
          style={({ pressed }) => [styles.basisRow, pressed && styles.pressed]}>
          <Text style={styles.basis}>
            {period === 'day'
              ? t('periodSingle', {
                  date: formatDate(endDate),
                  previous: formatDate(shiftDays(endDate, -1)),
                })
              : t('periodRange', {
                  from: formatDate(shiftDays(endDate, -(shape.days - 1))),
                  to: formatDate(endDate),
                  days: shape.days,
                })}
          </Text>
          <Text style={styles.basisChevron}>{calendarOpen ? '⌃' : '⌄'}</Text>
        </Pressable>

        {calendarOpen ? (
          <Calendar
            value={endDate}
            onPick={(date) => {
              setEndDate(date);
              setCalendarOpen(false);
              setPickedBar(null);
            }}
          />
        ) : null}

        {/* Плитки — и сводка, и переключатель графика: отдельный список
            показателей занял бы место и повторял бы эти же слова. */}
        <View style={styles.tiles}>
          {METRICS.map((key) => {
            const item = data.metrics[key];
            const active = key === metric;
            const rising = item.delta > 0;
            const positive = rising === item.good;

            return (
              <Pressable
                key={key}
                onPress={() => setMetric(key)}
                style={({ pressed }) => [
                  styles.tile,
                  active && { borderColor: accent, backgroundColor: tint(accent) },
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.tileLabel}>{t(METRIC_LABELS[key])}</Text>
                <View style={styles.tileValueRow}>
                  <Text style={styles.tileValue}>{grouped(item.value)}</Text>
                  {item.unit ? <Text style={styles.tileUnit}>{t(item.unit)}</Text> : null}
                </View>
                <View style={styles.tileFoot}>
                  <Text
                    style={[styles.tileDelta, { color: positive ? Palette.ok : Palette.warn }]}>
                    {formatDelta(item)}
                  </Text>
                  <Text style={styles.tileWas}>
                    {t('wasBefore', { value: grouped(previousValue(item)) })}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.label}>
              {t(METRIC_LABELS[metric])} {t(period === 'quarter' ? 'byWeeks' : 'byDays')}
            </Text>
            {/* Пока столбик не выбран — единица измерения, после выбора —
                дата и число: подписывать каждый столбик негде. */}
            {picked ? (
              <Text style={styles.headPicked}>
                {formatDate(picked.date)} · {grouped(picked.value)}
                {current.unit ? ` ${t(current.unit)}` : ''}
              </Text>
            ) : current.unit ? (
              <Text style={styles.headUnit}>{t(current.unit)}</Text>
            ) : null}
          </View>

          <View style={styles.chart}>
            {current.series.map((value, index) => {
              const dimmed = pickedBar !== null && pickedBar !== index;
              return (
                <Pressable
                  key={index}
                  onPress={() => setPickedBar(pickedBar === index ? null : index)}
                  style={styles.barCell}>
                  <View
                    style={[
                      styles.bar,
                      dimmed && styles.barDimmed,
                      {
                        height: Math.max(
                          BAR_MIN_HEIGHT,
                          Math.round((value / peak) * CHART_HEIGHT),
                        ),
                        backgroundColor: accent,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.axis}>
            <Text style={styles.axisLabel}>{formatDate(barDate(0))}</Text>
            <Text style={styles.axisLabel}>
              {formatDate(barDate(Math.floor((shape.points - 1) / 2)))}
            </Text>
            <Text style={styles.axisLabel}>{formatDate(endDate)}</Text>
          </View>
        </View>

        <View style={styles.sync}>
          <View style={styles.pulse} />
          <Text style={styles.syncText}>{t('dataUpdated', { hours: 2 })}</Text>
        </View>
      </ScrollView>
    </MarketplaceShell>
  );
}

/** Заливка выбранной плитки: цвет маркетплейса в 5 % поверх белого. */
function tint(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel * 0.05 + 255 * 0.95);
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`;
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  basis: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: Palette.muted,
  },
  basisChevron: {
    fontSize: 12,
    color: Palette.muted,
  },

  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  tile: {
    // Ровно два в ряд: половина ширины минус половина зазора.
    width: '48.5%',
    flexGrow: 1,
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
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 5,
  },
  tileFoot: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  tileDelta: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    fontWeight: '500',
  },
  tileWas: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    color: Palette.dim,
  },
  tileUnit: {
    fontSize: 11,
    color: Palette.muted,
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
    marginBottom: 13,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Palette.muted,
  },
  headUnit: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Palette.dim,
  },
  headPicked: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: Palette.ink,
  },

  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: CHART_HEIGHT,
  },
  barCell: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
  },
  barDimmed: {
    opacity: 0.3,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    fontSize: 9.5,
    color: Palette.muted,
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
