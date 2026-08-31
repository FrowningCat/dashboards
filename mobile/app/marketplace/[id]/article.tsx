import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { MarketplaceShell } from '@/components/marketplace-shell';
import { Brand, Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { useTranslation, type Language, type TranslationKey } from '@/lib/i18n';
import { isMarketplaceId, type MarketplaceId } from '@/lib/marketplaces';

type SizeStock = {
  /** Человекочитаемый размер. В остатках WB приходит код chrtId, а сам размер
   *  лежит только в продажах — связку ещё предстоит выгрузить. */
  size: string;
  quantity: number;
};

type Warehouse = {
  name: string;
  quantity: number;
  sizes: readonly SizeStock[];
  /** Отправлено покупателям с этого склада и возвращается на него. */
  inWayToClient: number;
  inWayFromClient: number;
};

const PERIODS = ['day', 'week', 'month', 'all'] as const;

type Period = (typeof PERIODS)[number];

const PERIOD_LABELS: Record<Period, TranslationKey> = {
  day: 'periodDay',
  week: 'periodWeek',
  month: 'periodMonth',
  all: 'periodAll',
};

type Sales = {
  pairs: number;
  /** Рублями, числом: от него считается доля выбранного размера. */
  revenue: number;
  sizes: readonly SizeStock[];
};

type Claim = {
  id: string;
  date: string;
  type: string;
  comment: string;
  resolved: boolean;
};

type Article = {
  nmId: number;
  vendorCode: string;
  name: string;
  rating: number;
  reviews: number;
  sizes: readonly SizeStock[];
  warehouses: readonly Warehouse[];
  sales: Record<Period, Sales>;
  claims: readonly Claim[];
  stockAgeHours: number;
};

/**
 * Раскладывает число по размерам пропорционально остаткам.
 *
 * Только для заглушки: настоящие разрезы придут из базы уже посчитанными,
 * там продажи хранятся построчно с размером в techSize. Последний размер
 * добирает остаток, чтобы сумма сходилась с исходным числом.
 */
function spread(total: number, shape: readonly SizeStock[]): SizeStock[] {
  const sum = shape.reduce((acc, item) => acc + item.quantity, 0) || 1;
  let left = total;

  return shape.map((item, index) => {
    const last = index === shape.length - 1;
    const share = last ? left : Math.round((item.quantity / sum) * total);
    left -= share;
    return { size: item.size, quantity: Math.max(0, share) };
  });
}

function warehouse(
  name: string,
  quantity: number,
  shape: readonly SizeStock[],
  inWayToClient: number,
  inWayFromClient: number,
): Warehouse {
  return { name, quantity, sizes: spread(quantity, shape), inWayToClient, inWayFromClient };
}

function sales(pairs: number, revenue: number, shape: readonly SizeStock[]): Sales {
  return { pairs, revenue, sizes: spread(pairs, shape) };
}

/** Доля выбранного размера в числе, посчитанном по всем размерам. */
function share(total: number, part: number, whole: number): number {
  return whole > 0 ? Math.round((total * part) / whole) : 0;
}

function sizeIn(sizes: readonly SizeStock[], size: string | null): number | null {
  if (!size) {
    return null;
  }
  return sizes.find((item) => item.size === size)?.quantity ?? 0;
}

const BOOTS = [
  { size: '39', quantity: 12 },
  { size: '40', quantity: 28 },
  { size: '41', quantity: 35 },
  { size: '42', quantity: 31 },
  { size: '43', quantity: 24 },
  { size: '44', quantity: 3 },
] as const;

const SNEAKERS = [
  { size: '39', quantity: 4 },
  { size: '40', quantity: 19 },
  { size: '41', quantity: 22 },
  { size: '42', quantity: 16 },
  { size: '43', quantity: 9 },
  { size: '44', quantity: 7 },
] as const;

const SHOES = [
  { size: '40', quantity: 6 },
  { size: '41', quantity: 11 },
  { size: '42', quantity: 14 },
  { size: '43', quantity: 2 },
] as const;

const OZ_BOOTS = [
  { size: '40', quantity: 9 },
  { size: '41', quantity: 14 },
  { size: '42', quantity: 11 },
  { size: '43', quantity: 5 },
] as const;

const OZ_SNEAKERS = [
  { size: '41', quantity: 3 },
  { size: '42', quantity: 8 },
  { size: '43', quantity: 4 },
] as const;

/**
 * Заглушка. Форма повторяет то, что вернёт API, поэтому подмена сведётся
 * к замене константы на запрос.
 *
 * Данные для настоящей версии есть в базе и сходятся по nmId: остатки
 * по складам, продажи с размером и ценой, претензии с комментариями, карточки.
 */
const ARTICLES: Record<MarketplaceId, readonly Article[]> = {
  wb: [
    {
      nmId: 226727766,
      vendorCode: 'ШМ-1043',
      name: 'Ботинки зимние, нубук',
      rating: 4.7,
      reviews: 128,
      sizes: BOOTS,
      warehouses: [
        warehouse('Коледино', 89, BOOTS, 24, 8),
        warehouse('Электросталь', 41, BOOTS, 11, 4),
        warehouse('Казань', 3, BOOTS, 1, 0),
        warehouse('Склад продавца', 17, BOOTS, 5, 2),
      ],
      sales: {
        day: sales(4, 7_100, BOOTS),
        week: sales(23, 41_200, BOOTS),
        month: sales(96, 172_400, BOOTS),
        all: sales(1204, 2_140_000, BOOTS),
      },
      claims: [
        {
          id: 'c-1',
          date: '26.08',
          type: 'Брак',
          comment: 'Разошёлся шов на правом ботинке после недели носки',
          resolved: false,
        },
        {
          id: 'c-2',
          date: '24.08',
          type: 'Не подошёл размер',
          comment: 'Маломерит, брала 41, пришёл как 40',
          resolved: false,
        },
        {
          id: 'c-3',
          date: '19.08',
          type: 'Брак',
          comment: 'Царапина на носке, обменяли',
          resolved: true,
        },
      ],
      stockAgeHours: 2,
    },
    {
      nmId: 198340115,
      vendorCode: 'ШМ-0871',
      name: 'Кроссовки летние, сетка',
      rating: 4.9,
      reviews: 341,
      sizes: SNEAKERS,
      warehouses: [
        warehouse('Коледино', 52, SNEAKERS, 14, 5),
        warehouse('Казань', 25, SNEAKERS, 7, 2),
      ],
      sales: {
        day: sales(6, 8_600, SNEAKERS),
        week: sales(41, 58_900, SNEAKERS),
        month: sales(158, 227_000, SNEAKERS),
        all: sales(2870, 4_020_000, SNEAKERS),
      },
      claims: [],
      stockAgeHours: 2,
    },
    {
      nmId: 241009338,
      vendorCode: 'ШМ-1180',
      name: 'Полуботинки кожаные',
      rating: 4.2,
      reviews: 46,
      sizes: SHOES,
      warehouses: [warehouse('Коледино', 20, SHOES, 5, 2), warehouse('Склад продавца', 13, SHOES, 4, 1)],
      sales: {
        day: sales(1, 2_400, SHOES),
        week: sales(8, 19_400, SHOES),
        month: sales(29, 70_300, SHOES),
        all: sales(412, 998_000, SHOES),
      },
      claims: [
        {
          id: 'c-4',
          date: '27.08',
          type: 'Не соответствует описанию',
          comment: 'Цвет темнее, чем на фото',
          resolved: false,
        },
      ],
      stockAgeHours: 2,
    },
  ],
  ozon: [
    {
      nmId: 1544820193,
      vendorCode: 'ШМ-1043',
      name: 'Ботинки зимние, нубук',
      rating: 4.6,
      reviews: 54,
      sizes: OZ_BOOTS,
      warehouses: [warehouse('Хоругвино', 27, OZ_BOOTS, 7, 2), warehouse('Склад продавца', 12, OZ_BOOTS, 3, 1)],
      sales: {
        day: sales(1, 1_800, OZ_BOOTS),
        week: sales(7, 12_600, OZ_BOOTS),
        month: sales(31, 55_800, OZ_BOOTS),
        all: sales(288, 518_000, OZ_BOOTS),
      },
      claims: [],
      stockAgeHours: 5,
    },
    {
      nmId: 1601773540,
      vendorCode: 'ШМ-0871',
      name: 'Кроссовки летние, сетка',
      rating: 4.8,
      reviews: 97,
      sizes: OZ_SNEAKERS,
      warehouses: [warehouse('Хоругвино', 15, OZ_SNEAKERS, 4, 1)],
      sales: {
        day: sales(2, 2_800, OZ_SNEAKERS),
        week: sales(11, 15_300, OZ_SNEAKERS),
        month: sales(44, 61_200, OZ_SNEAKERS),
        all: sales(619, 861_000, OZ_SNEAKERS),
      },
      claims: [
        {
          id: 'c-5',
          date: '25.08',
          type: 'Брак',
          comment: 'Отклеилась подошва',
          resolved: false,
        },
      ],
      stockAgeHours: 5,
    },
  ],
};

/** Ниже этого порога размер подсвечивается: он вот-вот кончится. */
const LOW_STOCK = 5;

const BAR_MAX_HEIGHT = 50;
const BAR_MIN_HEIGHT = 4;

function totalStock(article: Article): number {
  return article.sizes.reduce((sum, item) => sum + item.quantity, 0);
}

function openClaims(article: Article): number {
  return article.claims.filter((claim) => !claim.resolved).length;
}

/**
 * Разряды через неразрывный пробел, как в макете: 50 575, а не 50575.
 * Пробел неразрывный, чтобы число не переносилось по половинкам.
 */
function grouped(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function money(value: number): string {
  return `${grouped(value)} ₽`;
}

/** В русском дробный разделитель — запятая, в китайском точка. */
function formatRating(rating: number, language: Language): string {
  const text = rating.toFixed(1);
  return language === 'ru' ? text.replace('.', ',') : text;
}

export default function MarketplaceArticleScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [openedId, setOpenedId] = useState<number | null>(null);

  const found = useMemo(() => {
    const catalogue = isMarketplaceId(id) ? ARTICLES[id] : [];
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return catalogue;
    }
    return catalogue.filter(
      (article) =>
        article.vendorCode.toLowerCase().includes(needle) ||
        article.name.toLowerCase().includes(needle) ||
        String(article.nmId).includes(needle),
    );
  }, [id, query]);

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  const accent = Brand[id].accent;
  const opened = found.find((article) => article.nmId === openedId) ?? null;

  return (
    <MarketplaceShell id={id} active="article">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <TextInput
          style={[styles.search, searchFocused && styles.searchFocused]}
          value={query}
          onChangeText={(next) => {
            setQuery(next);
            // Список пересобрался — открытая карточка могла из него выпасть.
            setOpenedId(null);
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={t('articleSearch')}
          placeholderTextColor={Palette.dim}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />

        {found.length === 0 ? <Text style={styles.empty}>{t('articleNothing')}</Text> : null}

        {opened ? (
          <ArticleDetail
            // Ключ сбрасывает состояние раскрытых блоков при смене артикула:
            // иначе открытый склад «переезжал» бы на соседний товар.
            key={opened.nmId}
            article={opened}
            accent={accent}
            onClose={() => setOpenedId(null)}
          />
        ) : (
          found.map((article) => (
            <Pressable
              key={article.nmId}
              onPress={() => setOpenedId(article.nmId)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.thumb} />
              <View style={styles.rowTexts}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {article.name}
                </Text>
                <Text style={styles.rowCode}>
                  {article.vendorCode} · {article.nmId}
                </Text>
              </View>
              <View style={styles.rowValue}>
                <Text style={styles.rowTotal}>{grouped(totalStock(article))}</Text>
                <Text style={styles.rowUnit}>{t('totalPairs')}</Text>
              </View>
            </Pressable>
          ))
        )}

        {!opened && found.length > 0 ? <Text style={styles.hint}>{t('articleHint')}</Text> : null}
      </ScrollView>
    </MarketplaceShell>
  );
}

function SizeBars({
  sizes,
  accent,
  selected = null,
  onSelect,
}: {
  sizes: readonly SizeStock[];
  accent: string;
  selected?: string | null;
  onSelect?: (size: string) => void;
}) {
  const { t } = useTranslation();
  const peak = Math.max(...sizes.map((item) => item.quantity), 1);

  return (
    <View style={styles.chart}>
      {/* Подпись прижата к низу, чтобы встать вровень с рядом размеров. */}
      <View style={styles.gutter}>
        <Text style={styles.gutterLabel}>{t('sizeLabel')}</Text>
      </View>

      <View style={styles.bars}>
        {sizes.map((item) => {
          const low = item.quantity < LOW_STOCK;
          // Невыбранные приглушаются, а не прячутся: видно, из чего выбирали.
          const dimmed = selected !== null && selected !== item.size;
          const height = Math.max(
            BAR_MIN_HEIGHT,
            Math.round((item.quantity / peak) * BAR_MAX_HEIGHT),
          );

          return (
            <Pressable
              key={item.size}
              disabled={!onSelect}
              onPress={() => onSelect?.(item.size)}
              style={[styles.bar, dimmed && styles.barDimmed]}>
              <Text style={[styles.barValue, low && styles.barValueLow]}>
                {grouped(item.quantity)}
              </Text>
              <View
                style={[styles.barFill, { height, backgroundColor: low ? Palette.warn : accent }]}
              />
              <Text style={[styles.barSize, selected === item.size && styles.barSizeActive]}>
                {item.size}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Значения склада с поправкой на выбранный размер. */
function warehouseView(item: Warehouse, size: string | null) {
  const sized = sizeIn(item.sizes, size);
  if (sized === null) {
    return {
      quantity: item.quantity,
      toClient: item.inWayToClient,
      fromClient: item.inWayFromClient,
    };
  }
  return {
    quantity: sized,
    toClient: share(item.inWayToClient, sized, item.quantity),
    fromClient: share(item.inWayFromClient, sized, item.quantity),
  };
}

function Warehouses({
  article,
  accent,
  size,
  onSelectSize,
}: {
  article: Article;
  accent: string;
  size: string | null;
  onSelectSize: (size: string) => void;
}) {
  const { t } = useTranslation();
  const [needle, setNeedle] = useState('');
  const [focused, setFocused] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);

  const list = useMemo(() => {
    const text = needle.trim().toLowerCase();
    if (!text) {
      return article.warehouses;
    }
    return article.warehouses.filter((item) => item.name.toLowerCase().includes(text));
  }, [article.warehouses, needle]);

  // Итог по всем складам, а не только по найденным: строка отвечает на вопрос
  // «сколько всего в пути», и фильтр по названию не должен её менять.
  const totals = article.warehouses.reduce(
    (acc, item) => {
      const view = warehouseView(item, size);
      return { toClient: acc.toClient + view.toClient, fromClient: acc.fromClient + view.fromClient };
    },
    { toClient: 0, fromClient: 0 },
  );

  return (
    <View style={styles.card}>
      <View style={[styles.headRow, styles.labelSpaced]}>
        <Text style={styles.label}>{t('warehousesTitle')}</Text>
        {size ? <Text style={styles.label}>· {size}</Text> : null}
      </View>

      {/* Поле фильтрует список, а сам список и есть перечень складов:
          нужный находится и набором, и просмотром. */}
      <TextInput
        style={[styles.filter, focused && styles.filterFocused]}
        value={needle}
        onChangeText={(next) => {
          setNeedle(next);
          setOpened(null);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t('warehouseSearch')}
        placeholderTextColor={Palette.dim}
        autoCorrect={false}
      />

      {list.length === 0 ? <Text style={styles.emptySmall}>{t('warehouseNothing')}</Text> : null}

      {list.map((item) => {
        const isOpen = opened === item.name;
        const view = warehouseView(item, size);

        return (
          <View key={item.name}>
            <Pressable
              onPress={() => setOpened(isOpen ? null : item.name)}
              style={({ pressed }) => [styles.line, pressed && styles.linePressed]}>
              <Text style={styles.lineChevron}>{isOpen ? '⌄' : '›'}</Text>
              <Text style={styles.lineName}>{item.name}</Text>
              <Text style={styles.lineValue}>{grouped(view.quantity)}</Text>
            </Pressable>

            {isOpen ? (
              <View style={styles.nested}>
                <SizeBars
                  sizes={item.sizes}
                  accent={accent}
                  selected={size}
                  onSelect={onSelectSize}
                />
                <View style={styles.nestedLines}>
                  <View style={styles.line}>
                    <Text style={styles.lineNameMuted}>{t('inWayToClient')}</Text>
                    <Text style={styles.lineValueMuted}>{grouped(view.toClient)}</Text>
                  </View>
                  <View style={styles.line}>
                    <Text style={styles.lineNameMuted}>{t('inWayFromClient')}</Text>
                    <Text style={styles.lineValueMuted}>{grouped(view.fromClient)}</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={[styles.line, styles.lineDivided]}>
        <Text style={styles.lineNameMuted}>{t('inWayToClient')}</Text>
        <Text style={styles.lineValueMuted}>{grouped(totals.toClient)}</Text>
      </View>
      <View style={styles.line}>
        <Text style={styles.lineNameMuted}>{t('inWayFromClient')}</Text>
        <Text style={styles.lineValueMuted}>{grouped(totals.fromClient)}</Text>
      </View>
    </View>
  );
}

function SalesCard({
  article,
  accent,
  size,
  onSelectSize,
}: {
  article: Article;
  accent: string;
  size: string | null;
  onSelectSize: (size: string) => void;
}) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('week');
  const [showSizes, setShowSizes] = useState(false);

  const figures = article.sales[period];
  const sized = sizeIn(figures.sizes, size);
  const pairs = sized ?? figures.pairs;
  const revenue = sized === null ? figures.revenue : share(figures.revenue, sized, figures.pairs);

  return (
    <View style={styles.card}>
      <View style={[styles.headRow, styles.labelSpaced]}>
        <Text style={styles.label}>{t('sold')}</Text>
        {size ? <Text style={styles.label}>· {size}</Text> : null}
      </View>

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
        onPress={() => setShowSizes(!showSizes)}
        style={({ pressed }) => [styles.soldRow, pressed && styles.linePressed]}>
        <View>
          <View style={styles.valueRow}>
            <Text style={styles.statValue}>{grouped(pairs)}</Text>
            <Text style={styles.statUnit}>{t('totalPairs')}</Text>
          </View>
          <Text style={styles.statCaption}>{money(revenue)}</Text>
        </View>
        <Text style={styles.lineChevron}>{showSizes ? '⌄' : '›'}</Text>
      </Pressable>

      {showSizes ? (
        <View style={styles.nested}>
          <Text style={[styles.label, styles.labelSpaced]}>{t('soldBySize')}</Text>
          <SizeBars
            sizes={figures.sizes}
            accent={accent}
            selected={size}
            onSelect={onSelectSize}
          />
        </View>
      ) : null}
    </View>
  );
}

function Claims({ article }: { article: Article }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const waiting = openClaims(article);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        disabled={article.claims.length === 0}
        style={({ pressed }) => [styles.soldRow, pressed && styles.linePressed]}>
        <View>
          <Text style={styles.label}>{t('claimsTitle')}</Text>
          <Text style={[styles.statValue, waiting > 0 && styles.statValueWarn]}>{waiting}</Text>
          <Text style={styles.statCaption}>{t('claimsWaiting')}</Text>
        </View>
        {article.claims.length > 0 ? (
          <Text style={styles.lineChevron}>{expanded ? '⌄' : '›'}</Text>
        ) : null}
      </Pressable>

      {expanded ? (
        <View style={styles.nested}>
          {article.claims.map((claim) => (
            <View key={claim.id} style={styles.claim}>
              <View style={styles.claimHead}>
                <Text style={styles.claimDate}>{claim.date}</Text>
                <Text style={styles.claimType}>{claim.type}</Text>
                <Text style={[styles.claimStatus, claim.resolved && styles.claimStatusDone]}>
                  {claim.resolved ? t('claimResolved') : t('claimOpen')}
                </Text>
              </View>
              <Text style={styles.claimComment}>{claim.comment}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {article.claims.length === 0 ? (
        <Text style={styles.emptySmall}>{t('claimsNone')}</Text>
      ) : null}
    </View>
  );
}

function ArticleDetail({
  article,
  accent,
  onClose,
}: {
  article: Article;
  accent: string;
  onClose: () => void;
}) {
  const { t, language } = useTranslation();
  const [size, setSize] = useState<string | null>(null);

  // Один обработчик на все графики: размер выбирается где угодно, повторное
  // нажатие по тому же снимает выбор.
  const toggleSize = useCallback(
    (next: string) => setSize((current) => (current === next ? null : next)),
    [],
  );

  return (
    <View style={styles.detail}>
      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={({ pressed }) => [styles.toList, pressed && styles.toListPressed]}>
        <Text style={styles.toListChevron}>‹</Text>
        <Text style={styles.toListText}>{t('backToList')}</Text>
      </Pressable>

      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.photo} />
          <View style={styles.headerTexts}>
            <Text style={styles.name}>{article.name}</Text>
            <Text style={styles.code}>
              {article.vendorCode} · {article.nmId}
            </Text>
            <View style={styles.rating}>
              <Text style={[styles.star, { color: accent }]}>★</Text>
              <Text style={styles.ratingValue}>{formatRating(article.rating, language)}</Text>
              <Text style={styles.ratingReviews}>
                {t('reviews', { count: grouped(article.reviews) })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.headRow}>
            <Text style={styles.label}>{t('stockBySize')}</Text>
            {/* Выбранный размер показан отдельной меткой: по ней видно, почему
                числа ниже отличаются от общих, и ею же он снимается. */}
            {size ? (
              <Pressable onPress={() => setSize(null)} hitSlop={6} style={styles.chip}>
                <Text style={styles.chipText}>{t('sizeSelected', { size })}</Text>
                <Text style={styles.chipClose}>✕</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.headValue}>
            {grouped(sizeIn(article.sizes, size) ?? totalStock(article))}
          </Text>
        </View>
        <SizeBars
          sizes={article.sizes}
          accent={accent}
          selected={size}
          onSelect={toggleSize}
        />
      </View>

      <Warehouses article={article} accent={accent} size={size} onSelectSize={toggleSize} />
      <SalesCard article={article} accent={accent} size={size} onSelectSize={toggleSize} />
      <Claims article={article} />

      {/* Выгрузка ходит раз в сутки: без этой строки число на экране легко
          принять за сегодняшнее и решить по нему. */}
      <View style={styles.sync}>
        <View style={styles.pulse} />
        <Text style={styles.syncText}>{t('stockUpdated', { hours: article.stockAgeHours })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 9,
  },

  search: {
    backgroundColor: Palette.paper,
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.control,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: Fonts.mono,
    fontSize: 14.5,
    color: Palette.ink,
  },
  searchFocused: {
    borderColor: Palette.ink,
    boxShadow: '0 0 0 3px rgba(16, 19, 23, 0.10)',
  },

  empty: {
    fontSize: 13.5,
    color: Palette.muted,
    textAlign: 'center',
    paddingVertical: 28,
  },
  emptySmall: {
    fontSize: 12.5,
    color: Palette.muted,
    paddingVertical: 8,
  },
  hint: {
    fontSize: 12,
    color: Palette.dim,
    textAlign: 'center',
    paddingTop: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    padding: 13,
  },
  rowPressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Palette.field,
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.15,
    color: Palette.ink,
  },
  rowCode: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Palette.muted,
    marginTop: 2,
  },
  rowValue: {
    alignItems: 'flex-end',
  },
  rowTotal: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.ink,
  },
  rowUnit: {
    fontSize: 10,
    color: Palette.muted,
  },

  detail: {
    gap: 9,
  },
  toList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  toListPressed: {
    opacity: 0.6,
  },
  toListChevron: {
    fontSize: 15,
    lineHeight: 17,
    color: Palette.muted,
  },
  toListText: {
    fontSize: 12,
    fontWeight: '500',
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
  labelSpaced: {
    marginBottom: 11,
  },
  headValue: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.ink,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Palette.field,
  },
  headerTexts: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
    lineHeight: 20,
    color: Palette.ink,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Palette.muted,
    marginTop: 3,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  star: {
    fontSize: 12,
  },
  ratingValue: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.ink,
  },
  ratingReviews: {
    fontSize: 11,
    color: Palette.muted,
  },

  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  gutter: {
    justifyContent: 'flex-end',
  },
  gutterLabel: {
    fontSize: 9.5,
    color: Palette.dim,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  bar: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  barValue: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Palette.ink,
  },
  barValueLow: {
    color: Palette.warn,
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
  },
  barDimmed: {
    opacity: 0.35,
  },
  barSize: {
    fontSize: 10,
    color: Palette.muted,
  },
  barSizeActive: {
    fontWeight: '600',
    color: Palette.ink,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: Palette.field,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    color: Palette.ink,
  },
  chipClose: {
    fontSize: 12,
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
    marginBottom: 4,
  },
  filterFocused: {
    borderColor: Palette.line,
    backgroundColor: Palette.paper,
  },

  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    paddingVertical: 7,
  },
  linePressed: {
    opacity: 0.6,
  },
  lineDivided: {
    borderTopWidth: 1,
    borderTopColor: Palette.field,
    marginTop: 4,
    paddingTop: 9,
  },
  lineChevron: {
    fontSize: 13,
    color: Palette.dim,
    width: 10,
  },
  lineName: {
    flex: 1,
    fontSize: 13.5,
    color: Palette.ink,
  },
  lineNameMuted: {
    flex: 1,
    fontSize: 13.5,
    color: Palette.muted,
  },
  lineValue: {
    fontFamily: Fonts.mono,
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.ink,
  },
  lineValueMuted: {
    fontFamily: Fonts.mono,
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.muted,
  },
  nestedLines: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  nested: {
    backgroundColor: Palette.field,
    borderRadius: 10,
    padding: 12,
    marginTop: 2,
    marginBottom: 6,
  },

  segments: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 13,
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

  soldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  statUnit: {
    fontSize: 12,
    color: Palette.muted,
  },
  statValue: {
    fontFamily: Fonts.mono,
    fontSize: 19,
    fontWeight: '600',
    color: Palette.ink,
    marginTop: 4,
  },
  statValueWarn: {
    color: Palette.warn,
  },
  statCaption: {
    fontSize: 10.5,
    color: Palette.muted,
    marginTop: 2,
  },

  claim: {
    paddingVertical: 8,
  },
  claimHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  claimDate: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Palette.muted,
  },
  claimType: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.ink,
  },
  claimStatus: {
    fontSize: 10.5,
    fontWeight: '500',
    color: Palette.warn,
  },
  claimStatusDone: {
    color: Palette.ok,
  },
  claimComment: {
    fontSize: 12.5,
    lineHeight: 17,
    color: Palette.muted,
    marginTop: 4,
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
