import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { MarketplaceShell } from '@/components/marketplace-shell';
import { Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { ARTICLE_IDENTITIES, articleIdentity } from '@/lib/articles';
import { formatDate, shiftDays, startOfDay } from '@/lib/dates';
import { decimal, grouped, money } from '@/lib/format';
import { useTranslation, type Language, type TranslationKey } from '@/lib/i18n';
import { isMarketplaceId } from '@/lib/marketplaces';

const PERIODS = ['week', 'month', 'quarter'] as const;

type Period = (typeof PERIODS)[number];

const PERIOD_LABELS: Record<Period, TranslationKey> = {
  week: 'periodWeek',
  month: 'periodMonth',
  quarter: 'periodQuarter',
};

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, quarter: 90 };

type Figures = {
  impressions: number;
  clicks: number;
  orders: number;
  boughtOut: number;
  /** Рубли. */
  spend: number;
  /** Выручка, которую рекламный кабинет засчитал этой кампании. */
  revenue: number;
};

/** Товар в кампании и расход, который на него пришёлся. */
type CampaignArticle = {
  nmId: number;
  spend: number;
};

type Campaign = Figures & {
  /** Номер кампании из рекламного кабинета. */
  id: number;
  /** Название задаёт продавец, поэтому в словарь не идёт и не переводится. */
  name: string;
  articles: readonly CampaignArticle[];
};

/**
 * Кампания в заглушке. Расхода здесь нет намеренно: он складывается из
 * товаров — тем же правилом, каким итог экрана складывается из кампаний.
 * Так строка кампании и её раскрытие не могут разойтись.
 */
type CampaignSeed = Omit<Figures, 'spend'> & {
  id: number;
  name: string;
  articles: readonly CampaignArticle[];
};

/**
 * Заглушка. Ни одного из этих чисел в базе нет: показы, клики, расход и состав
 * кампаний отдаёт рекламный API Wildberries, а не тот же экспорт, что остатки
 * и продажи. Под него нужен отдельный выгружатель и ключ с правом «Реклама» —
 * статистического не хватит.
 *
 * Форма повторяет ответ API, поэтому переход на живые данные сведётся
 * к замене этой константы на загрузку.
 *
 * Числа даны за тридцать дней и сходятся сразу в двух направлениях.
 *
 * Внутрь: выкупы — 85 % заказов, а суммы по кампаниям дают итог экрана.
 * Итог не хранится отдельно, он считается сложением — иначе шапка и список
 * однажды разъедутся.
 *
 * Наружу: вся эта воронка — платная доля той, что показывает «История».
 * Там 420 000 просмотров, 33 600 кликов и 3 276 заказов на весь трафик,
 * здесь около шестидесяти процентов от каждого. Совпади числа с «Историей»
 * один в один — вышло бы, что органики нет вовсе, и два экрана
 * противоречили бы друг другу.
 */
const CAMPAIGNS: readonly CampaignSeed[] = [
  {
    id: 21402118,
    name: 'Ботинки зимние — поиск',
    impressions: 101_000,
    clicks: 8_400,
    orders: 880,
    boughtOut: 748,
    revenue: 1_233_000,
    articles: [
      { nmId: ARTICLE_IDENTITIES.boots.nmId, spend: 112_000 },
      { nmId: ARTICLE_IDENTITIES.lowShoes.nmId, spend: 36_000 },
    ],
  },
  {
    id: 21398045,
    name: 'Кроссовки — автокампания',
    impressions: 79_000,
    clicks: 5_900,
    orders: 520,
    boughtOut: 442,
    revenue: 640_000,
    articles: [{ nmId: ARTICLE_IDENTITIES.sneakers.nmId, spend: 96_000 }],
  },
  {
    id: 21377610,
    name: 'Полуботинки — каталог',
    impressions: 46_000,
    clicks: 3_600,
    orders: 310,
    boughtOut: 264,
    revenue: 258_000,
    articles: [{ nmId: ARTICLE_IDENTITIES.lowShoes.nmId, spend: 62_000 }],
  },
  {
    id: 21355902,
    name: 'Бренд — поиск',
    // По брендовым запросам CTR всегда выше прочих: человек ищет уже нас.
    impressions: 22_000,
    clicks: 2_100,
    orders: 240,
    boughtOut: 204,
    revenue: 486_000,
    // Брендовая кампания тянет весь ассортимент, поэтому товаров три,
    // а расход на каждый небольшой.
    articles: [
      { nmId: ARTICLE_IDENTITIES.boots.nmId, spend: 14_000 },
      { nmId: ARTICLE_IDENTITIES.sneakers.nmId, spend: 12_000 },
      { nmId: ARTICLE_IDENTITIES.lowShoes.nmId, spend: 8_000 },
    ],
  },
];

/**
 * Во сколько раз период отличается от базовых тридцати дней — по каждому
 * показателю свой множитель, а не один общий.
 *
 * Общий множитель был бы проще, но от него все отношения — CTR, конверсия
 * в заказ, выкуп, ДРР, цена клика — выходят одинаковыми на любом окне,
 * и переключатель периодов выглядит сломанным. Между тем именно эти
 * отношения на экране и смотрят.
 *
 * Числа подобраны так, что реклама год к году работает лучше: за последнюю
 * неделю CTR и ДРР заметно приятнее квартальных.
 */
const PERIOD_SCALE: Record<Period, Record<keyof Figures, number>> = {
  week: {
    impressions: 0.228,
    clicks: 0.242,
    orders: 0.252,
    boughtOut: 0.2545,
    spend: 0.221,
    revenue: 0.245,
  },
  month: { impressions: 1, clicks: 1, orders: 1, boughtOut: 1, spend: 1, revenue: 1 },
  quarter: {
    impressions: 3.22,
    clicks: 3.02,
    orders: 2.92,
    boughtOut: 2.885,
    spend: 3.18,
    revenue: 2.96,
  },
};

/**
 * С чем сравнивается период: насколько вырос расход и каким был ДРР
 * в предыдущем таком же окне. У каждого периода своё — одинаковые «+12 %»
 * и на неделе, и на квартале выдали бы заглушку с головой.
 */
const COMPARISON: Record<Period, { spendGrowth: number; previousDrr: number }> = {
  week: { spendGrowth: 8, previousDrr: 12.9 },
  month: { spendGrowth: 12, previousDrr: 15.4 },
  quarter: { spendGrowth: 21, previousDrr: 14.8 },
};

/**
 * Порог, выше которого реклама съедает маржу. У обуви к двадцати процентам
 * кампания перестаёт окупаться, поэтому цифра краснеет не по знаку изменения,
 * а по абсолютной величине.
 */
const DRR_LIMIT = 20;

function snapshot(period: Period): Campaign[] {
  const scale = PERIOD_SCALE[period];

  return CAMPAIGNS.map((campaign) => {
    const articles = campaign.articles.map((item) => ({
      nmId: item.nmId,
      spend: Math.round(item.spend * scale.spend),
    }));

    return {
      ...campaign,
      articles,
      impressions: Math.round(campaign.impressions * scale.impressions),
      clicks: Math.round(campaign.clicks * scale.clicks),
      orders: Math.round(campaign.orders * scale.orders),
      boughtOut: Math.round(campaign.boughtOut * scale.boughtOut),
      revenue: Math.round(campaign.revenue * scale.revenue),
      // Складываем уже округлённые расходы по товарам, а не округляем сумму:
      // иначе список под кампанией не сходился бы с её же строкой на рубль.
      spend: articles.reduce((acc, item) => acc + item.spend, 0),
    };
  }).sort((a, b) => b.spend - a.spend);
}

function totals(list: readonly Campaign[]): Figures {
  return list.reduce<Figures>(
    (acc, item) => ({
      impressions: acc.impressions + item.impressions,
      clicks: acc.clicks + item.clicks,
      orders: acc.orders + item.orders,
      boughtOut: acc.boughtOut + item.boughtOut,
      spend: acc.spend + item.spend,
      revenue: acc.revenue + item.revenue,
    }),
    { impressions: 0, clicks: 0, orders: 0, boughtOut: 0, spend: 0, revenue: 0 },
  );
}

/** Доля рекламных расходов: сколько процентов выручки ушло на рекламу. */
function drr(figures: Figures): number {
  return figures.revenue > 0 ? (figures.spend / figures.revenue) * 100 : 0;
}

function percent(value: number, digits: number, language: Language): string {
  return `${decimal(value, digits, language)} %`;
}

function signed(value: number, digits: number, language: Language): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${decimal(value, digits, language)}`;
}

type FunnelStep = {
  key: keyof Figures;
  label: TranslationKey;
  /**
   * Переход к следующему шагу: как он называется и от чего считается.
   * У последнего шага следующего нет.
   */
  next: { label: TranslationKey; base: TranslationKey } | null;
};

/**
 * Столбиков у воронки нет намеренно. Показов четыреста двадцать тысяч, заказов
 * около двух — полоска заказов вышла бы в два пикселя и не сказала бы ничего,
 * а подогнать её длину «чтобы читалось» значит соврать про пропорцию.
 *
 * Вместо этого между строками стоит процент перехода. Он не хранится, а
 * считается делением следующей строки на предыдущую, поэтому его можно
 * честно подписать — «от показов», «от кликов» — и цифра всегда сходится
 * с теми двумя, что видно рядом.
 */
const FUNNEL: readonly FunnelStep[] = [
  {
    key: 'impressions',
    label: 'adsImpressions',
    next: { label: 'adsCtr', base: 'adsOfImpressions' },
  },
  { key: 'clicks', label: 'metricClicks', next: { label: 'adsToOrder', base: 'adsOfClicks' } },
  { key: 'orders', label: 'metricOrders', next: { label: 'adsBuyout', base: 'adsOfOrders' } },
  { key: 'boughtOut', label: 'adsBoughtOut', next: null },
];

export default function MarketplaceAdsScreen() {
  const { t, language } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [period, setPeriod] = useState<Period>('month');
  const [endDate, setEndDate] = useState(() => startOfDay(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [needle, setNeedle] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [opened, setOpened] = useState<number | null>(null);

  const campaigns = useMemo(() => snapshot(period), [period]);

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  // Итог считается по всем кампаниям, а не по найденным: поиск сужает список,
  // но не период. Иначе набранная в поле буква меняла бы расход за месяц.
  const sum = totals(campaigns);
  const days = PERIOD_DAYS[period];
  const comparison = COMPARISON[period];

  const spendBefore = Math.round(sum.spend / (1 + comparison.spendGrowth / 100));
  const drrNow = drr(sum);
  const drrShift = drrNow - comparison.previousDrr;

  const query = needle.trim().toLocaleLowerCase();
  const list = query
    ? campaigns.filter((campaign) => campaign.name.toLocaleLowerCase().includes(query))
    : campaigns;

  return (
    <MarketplaceShell id={id} active="ads">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.segments}>
          {PERIODS.map((key) => {
            const active = key === period;
            return (
              <Pressable
                key={key}
                onPress={() => setPeriod(key)}
                style={[styles.segment, active && styles.segmentActive]}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t(PERIOD_LABELS[key])}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setCalendarOpen(!calendarOpen)}
          style={({ pressed }) => [styles.basisRow, pressed && styles.pressed]}>
          <Text style={styles.basis}>
            {t('periodRange', {
              from: formatDate(shiftDays(endDate, -(days - 1))),
              to: formatDate(endDate),
              days,
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
            }}
          />
        ) : null}

        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{t('adsSpend')}</Text>
            <Text style={styles.tileValue}>{money(sum.spend)}</Text>
            <View style={styles.tileFoot}>
              {/* Рост расхода сам по себе не хорош и не плох: окупился он
                  или нет, говорит ДРР. Поэтому цвета здесь нет. */}
              <Text style={styles.tileDelta}>
                {signed(comparison.spendGrowth, 0, language)} %
              </Text>
              <Text style={styles.tileWas}>{t('wasBefore', { value: money(spendBefore) })}</Text>
            </View>
          </View>

          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{t('adsDrr')}</Text>
            <Text
              style={[styles.tileValue, { color: drrNow > DRR_LIMIT ? Palette.warn : Palette.ok }]}>
              {percent(drrNow, 1, language)}
            </Text>
            <View style={styles.tileFoot}>
              {/* У ДРР знак и польза связаны наоборот, чем у остальных
                  показателей: падение — хорошо, рост — плохо. */}
              <Text
                style={[styles.tileDelta, { color: drrShift <= 0 ? Palette.ok : Palette.warn }]}>
                {signed(drrShift, 1, language)} {t('percentPoints')}
              </Text>
              <Text style={styles.tileWas}>
                {t('wasBefore', { value: percent(comparison.previousDrr, 1, language) })}
              </Text>
            </View>
          </View>
        </View>

        {/* Формула стоит на экране, а не в подсказке: «13 %» без делимого
            и делителя проверить нечем, а проверять хочется. */}
        <View style={styles.formula}>
          <Text style={styles.formulaText}>{t('adsDrrExplain')}</Text>
          <Text style={styles.formulaText}>
            {t('adsDrrFormula', {
              spend: money(sum.spend),
              revenue: money(sum.revenue),
              drr: percent(drrNow, 1, language),
            })}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.label, styles.labelSpaced]}>{t('adsFunnel')}</Text>

          {FUNNEL.map((step, index) => {
            const last = step.next === null;
            const from = sum[step.key];
            const rate = step.next && from > 0 ? (sum[FUNNEL[index + 1].key] / from) * 100 : 0;

            return (
              <View key={step.key}>
                <View style={[styles.step, last && styles.stepLast]}>
                  <Text style={[styles.stepName, last && styles.stepNameLast]}>
                    {t(step.label)}
                  </Text>
                  <Text style={[styles.stepValue, last && styles.stepValueLast]}>
                    {grouped(from)}
                  </Text>
                </View>

                {step.next ? (
                  <View style={styles.conversion}>
                    <View style={styles.rail} />
                    <Text style={styles.conversionName}>{t(step.next.label)}</Text>
                    <Text style={styles.conversionRate}>{percent(rate, 1, language)}</Text>
                    <Text style={styles.conversionBase}>{t(step.next.base)}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          <Text style={styles.unitCosts}>
            {t('adsUnitCosts', {
              cpc: `${decimal(sum.spend / Math.max(sum.clicks, 1), 2, language)} ₽`,
              cpo: money(Math.round(sum.spend / Math.max(sum.boughtOut, 1))),
            })}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('adsCampaigns')}</Text>

          {/* Кампаний в кабинете обычно десятки: список без поиска
              пролистывается дольше, чем набирается название. */}
          <TextInput
            style={[styles.filter, searchFocused && styles.filterFocused]}
            value={needle}
            onChangeText={(next) => {
              setNeedle(next);
              // Раскрытая кампания может выпасть из выдачи — тогда раскрытым
              // остался бы невидимый ряд.
              setOpened(null);
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={t('adsCampaignSearch')}
            placeholderTextColor={Palette.dim}
            autoCorrect={false}
          />

          {list.length === 0 ? (
            <Text style={styles.emptySmall}>{t('adsCampaignNothing')}</Text>
          ) : null}

          {list.map((campaign, index) => {
            const isOpen = opened === campaign.id;
            const share = drr(campaign);

            return (
              <View key={campaign.id} style={index > 0 ? styles.campaignDivided : undefined}>
                <Pressable
                  onPress={() => setOpened(isOpen ? null : campaign.id)}
                  style={({ pressed }) => [styles.campaign, pressed && styles.pressed]}>
                  <View style={styles.campaignTexts}>
                    <Text style={styles.campaignName}>{campaign.name}</Text>
                    <Text style={styles.campaignMeta}>
                      {t('adsCampaignSpend', {
                        spend: money(campaign.spend),
                        clicks: grouped(campaign.clicks),
                      })}
                    </Text>
                  </View>
                  <Text style={styles.campaignChevron}>{isOpen ? '⌄' : '›'}</Text>
                </Pressable>

                {isOpen ? (
                  <View style={styles.nested}>
                    <View style={styles.line}>
                      <Text style={styles.lineName}>{t('adsImpressions')}</Text>
                      <Text style={styles.lineValue}>{grouped(campaign.impressions)}</Text>
                    </View>
                    <View style={styles.line}>
                      <Text style={styles.lineName}>{t('metricClicks')}</Text>
                      <Text style={styles.lineValue}>{grouped(campaign.clicks)}</Text>
                    </View>
                    <View style={styles.line}>
                      <Text style={styles.lineName}>{t('metricOrders')}</Text>
                      <Text style={styles.lineValue}>{grouped(campaign.orders)}</Text>
                    </View>
                    <View style={styles.line}>
                      <Text style={styles.lineName}>{t('adsBoughtOut')}</Text>
                      <Text style={styles.lineValue}>{grouped(campaign.boughtOut)}</Text>
                    </View>
                    <View style={styles.line}>
                      <Text style={styles.lineName}>{t('metricRevenue')}</Text>
                      <Text style={styles.lineValue}>{money(campaign.revenue)}</Text>
                    </View>
                    {/* ДРР из общего списка убран, но здесь он и есть ответ
                        на вопрос «стоит ли эта кампания своих денег». */}
                    <View style={[styles.line, styles.lineDivided]}>
                      <Text style={styles.lineName}>{t('adsDrr')}</Text>
                      <Text
                        style={[
                          styles.lineValue,
                          { color: share > DRR_LIMIT ? Palette.warn : Palette.ok },
                        ]}>
                        {percent(share, 1, language)}
                      </Text>
                    </View>

                    {/* Расход по товарам, а не просто перечень: без суммы
                        рядом непонятно, кто из них и съел бюджет кампании. */}
                    <Text style={[styles.label, styles.articlesLabel]}>
                      {t('adsCampaignArticles')}
                    </Text>

                    {campaign.articles.map((item) => {
                      const identity = articleIdentity(item.nmId);

                      return (
                        <View key={item.nmId} style={styles.articleRow}>
                          <View style={styles.articleTexts}>
                            <Text style={styles.articleName}>
                              {identity ? identity.name : String(item.nmId)}
                            </Text>
                            {identity ? (
                              <Text style={styles.articleCode}>
                                {identity.vendorCode} · {item.nmId}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.articleSpend}>{money(item.spend)}</Text>
                        </View>
                      );
                    })}
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
    color: Palette.ink,
  },
  tileWas: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    color: Palette.dim,
  },

  formula: {
    paddingHorizontal: 3,
    gap: 2,
  },
  formulaText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: Palette.muted,
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
  },
  labelSpaced: {
    marginBottom: 4,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 9,
    paddingVertical: 6,
  },
  stepLast: {
    borderTopWidth: 1,
    borderTopColor: Palette.field,
    marginTop: 4,
    paddingTop: 10,
  },
  stepName: {
    fontSize: 13.5,
    color: Palette.ink,
  },
  stepNameLast: {
    fontWeight: '600',
  },
  stepValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.ink,
  },
  stepValueLast: {
    fontSize: 16,
  },

  conversion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /**
   * Отрезок вместо стрелки: он занимает высоту перехода и связывает соседние
   * строки, а стрелка на пятнадцати пикселях превращается в точку.
   */
  rail: {
    width: 2,
    height: 15,
    borderRadius: 1,
    backgroundColor: Palette.line,
  },
  conversionName: {
    fontSize: 11,
    color: Palette.ink,
  },
  conversionRate: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: Palette.ink,
  },
  conversionBase: {
    fontSize: 11,
    color: Palette.dim,
  },

  unitCosts: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    color: Palette.muted,
    textAlign: 'right',
    marginTop: 6,
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
  emptySmall: {
    fontSize: 12.5,
    color: Palette.dim,
    paddingVertical: 9,
  },

  campaign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  campaignDivided: {
    borderTopWidth: 1,
    borderTopColor: Palette.field,
  },
  campaignTexts: {
    flex: 1,
    minWidth: 0,
  },
  campaignName: {
    fontSize: 13,
    color: Palette.ink,
  },
  campaignMeta: {
    fontSize: 10.5,
    color: Palette.muted,
    marginTop: 2,
  },
  campaignChevron: {
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

  articlesLabel: {
    marginTop: 11,
    marginBottom: 1,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 9,
    paddingVertical: 5,
  },
  articleTexts: {
    flex: 1,
    minWidth: 0,
  },
  articleName: {
    fontSize: 12.5,
    color: Palette.ink,
  },
  articleCode: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Palette.dim,
    marginTop: 1,
  },
  articleSpend: {
    fontFamily: Fonts.mono,
    fontSize: 12,
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
