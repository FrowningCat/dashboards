import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MarketplaceShell } from '@/components/marketplace-shell';
import { Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { formatDate, previousWeek } from '@/lib/dates';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import {
  isMarketplaceId,
  marketplaceHref,
  type MarketplaceTab,
} from '@/lib/marketplaces';
import { downloadFinanceReport } from '@/lib/reports';

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; filename: string }
  | { state: 'error'; message: TranslationKey };

/** Код ошибки API — во фразу словаря. Текст сервера сюда не идёт: он русский. */
const ERROR_MESSAGES: Record<string, TranslationKey> = {
  notConfigured: 'errorNotConfigured',
  unreachable: 'errorUnreachable',
  serverError: 'errorServer',
  notImplemented: 'errorNotImplemented',
  noData: 'errorNoData',
  cannotSave: 'errorCannotSave',
};

type Section = {
  tab: MarketplaceTab;
  title: TranslationKey;
  hint: TranslationKey;
};

/**
 * Разделы, которым не хватило места в нижней панели: там четыре кнопки,
 * и все заняты. Открываются как обычные экраны, с возвратом сюда.
 */
const SECTIONS: readonly Section[] = [
  { tab: 'supplies', title: 'sectionSupplies', hint: 'sectionSuppliesHint' },
  { tab: 'stocks', title: 'sectionStocks', hint: 'sectionStocksHint' },
  { tab: 'stocks-fbs', title: 'sectionStocksFbs', hint: 'sectionStocksFbsHint' },
];

export default function MarketplaceMoreScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [status, setStatus] = useState<Status>({ state: 'idle' });

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  // Границы считаются при каждом рендере, а не запоминаются: приложение
  // может провисеть открытым с воскресенья на понедельник, и запомненная
  // неделя к утру устарела бы.
  const week = previousWeek();
  const busy = status.state === 'loading';

  const download = async () => {
    setStatus({ state: 'loading' });
    try {
      const filename = await downloadFinanceReport(week.from);
      setStatus({ state: 'done', filename });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'serverError';
      setStatus({ state: 'error', message: ERROR_MESSAGES[code] ?? 'errorUnknown' });
    }
  };

  return (
    <MarketplaceShell id={id} active="more">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>{t('reportFinance')}</Text>

          <View style={styles.headTight}>
            <View style={styles.texts}>
              {/* Границы недели стоят числами, а не словом «прошлая»: иначе
                  пришлось бы гадать, попадает туда воскресенье или нет. */}
              <Text style={styles.week}>
                {t('reportWeek', {
                  from: formatDate(week.from),
                  to: formatDate(week.to),
                })}
              </Text>
              <Text style={styles.note}>{t('reportWeekNote')}</Text>
            </View>

            <Pressable
              disabled={busy}
              onPress={download}
              style={({ pressed }) => [
                styles.button,
                busy && styles.buttonBusy,
                pressed && styles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator size="small" color={Palette.paper} />
              ) : (
                <Text style={styles.buttonText}>{t('reportDownload')}</Text>
              )}
            </Pressable>
          </View>

          {status.state === 'done' ? (
            <Text style={styles.done}>{t('reportSaved', { name: status.filename })}</Text>
          ) : null}

          {status.state === 'error' ? (
            <Text style={styles.failed}>{t(status.message)}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={[styles.label, styles.labelSpaced]}>{t('moreSections')}</Text>

          {SECTIONS.map((section, index) => (
            <Pressable
              key={section.tab}
              // push, а не replace: возврат должен приводить обратно сюда,
              // а не к выбору маркетплейса.
              onPress={() => router.push(marketplaceHref(id, section.tab))}
              style={({ pressed }) => [
                styles.link,
                index > 0 && styles.linkDivided,
                pressed && styles.pressed,
              ]}>
              <View style={styles.texts}>
                <Text style={styles.name}>{t(section.title)}</Text>
                <Text style={styles.hint}>{t(section.hint)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
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
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Palette.muted,
    marginBottom: 8,
  },
  labelSpaced: {
    marginBottom: 2,
  },

  headTight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    // Меньше, чем было с подзаголовком: без него отступ в двенадцать
    // пикселей оставлял под заголовком карточки пустую полосу.
    marginTop: 4,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.ink,
  },
  hint: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Palette.muted,
    marginTop: 2,
  },
  week: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.ink,
  },
  note: {
    fontSize: 10.5,
    lineHeight: 15,
    color: Palette.dim,
    marginTop: 3,
  },

  button: {
    // Ширина фиксирована, чтобы кружок ожидания не сжимал кнопку уже текста
    // и ряд не дёргался при каждом нажатии.
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Radius.control,
    backgroundColor: Palette.ink,
  },
  buttonBusy: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.paper,
  },

  done: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: Palette.ok,
    marginTop: 10,
  },
  failed: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Palette.warn,
    marginTop: 10,
  },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  linkDivided: {
    borderTopWidth: 1,
    borderTopColor: Palette.field,
  },
  chevron: {
    fontSize: 15,
    color: Palette.dim,
  },
});
