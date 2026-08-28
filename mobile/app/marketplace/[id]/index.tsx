import { Redirect, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MarketplaceShell } from '@/components/marketplace-shell';
import { Brand, Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { MARKETPLACE_NAMES, isMarketplaceId, type MarketplaceId } from '@/lib/marketplaces';

type Delta = {
  text: string;
  direction: 'up' | 'down';
};

type Section = {
  key: string;
  icon: TranslationKey;
  title: TranslationKey;
  hint: TranslationKey;
  value: string;
  caption?: TranslationKey;
  delta?: Delta;
  /** Раздел выделен цветом маркетплейса — по макету это финансовый отчёт. */
  accent?: boolean;
};

/**
 * Числа взяты из макета (для Wildberries) и подобраны по тому же масштабу
 * для Ozon. Настоящих пока нет: выгрузка остатков ещё не запускалась,
 * а по Ozon нет ни скрипта, ни данных.
 */
const SECTIONS: Record<MarketplaceId, readonly Section[]> = {
  wb: [
    {
      key: 'ads',
      icon: 'adsIcon',
      title: 'adsTitle',
      hint: 'adsHint',
      value: '3,85 %',
      caption: 'adsCaption',
    },
    {
      key: 'sales',
      icon: 'salesIcon',
      title: 'salesTitle',
      hint: 'salesHint',
      value: '2,4 млн',
      caption: 'salesCaption',
      delta: { text: '+12 %', direction: 'up' },
    },
    {
      key: 'stock',
      icon: 'stockIcon',
      title: 'stockTitle',
      hint: 'stockHint',
      value: '50 575',
      caption: 'stockCaption',
    },
    {
      key: 'supplies',
      icon: 'suppliesIcon',
      title: 'suppliesTitle',
      hint: 'suppliesHint',
      value: '6',
      caption: 'suppliesCaption',
    },
    {
      key: 'report',
      icon: 'reportIcon',
      title: 'reportTitle',
      hint: 'reportHint',
      value: '›',
      accent: true,
    },
  ],
  ozon: [
    {
      key: 'ads',
      icon: 'adsIcon',
      title: 'adsTitle',
      hint: 'adsHint',
      value: '2,10 %',
      caption: 'adsCaption',
    },
    {
      key: 'sales',
      icon: 'salesIcon',
      title: 'salesTitle',
      hint: 'salesHint',
      value: '418 тыс',
      caption: 'salesCaption',
      delta: { text: '−4 %', direction: 'down' },
    },
    {
      key: 'stock',
      icon: 'stockIcon',
      title: 'stockTitle',
      hint: 'stockHint',
      value: '12 480',
      caption: 'stockCaption',
    },
    {
      key: 'supplies',
      icon: 'suppliesIcon',
      title: 'suppliesTitle',
      hint: 'suppliesHint',
      value: '2',
      caption: 'suppliesCaption',
    },
    {
      key: 'report',
      icon: 'reportIcon',
      title: 'reportTitle',
      hint: 'reportHint',
      value: '›',
      accent: true,
    },
  ],
};

export default function MarketplaceSectionsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Чужой идентификатор в адресе — не повод падать: возвращаем к выбору.
  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  const accent = Brand[id].accent;
  const name = MARKETPLACE_NAMES[id];

  return (
    <MarketplaceShell id={id} active="dashboard">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Полоса идёт ровно по ширине названия, поэтому обёртка прижата
            влево по содержимому, а не растянута на всю строку. */}
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{name}</Text>
          <View style={[styles.bar, { backgroundColor: accent }]} />
        </View>

        {SECTIONS[id].map((section) => (
          <Pressable
            key={section.key}
            style={({ pressed }) => [
              styles.tile,
              section.accent && { borderColor: accent, backgroundColor: tint(accent) },
              pressed && styles.tilePressed,
            ]}>
            <View style={[styles.icon, section.accent && { backgroundColor: accent }]}>
              <Text style={[styles.iconText, { color: section.accent ? Palette.paper : accent }]}>
                {t(section.icon)}
              </Text>
            </View>

            <View style={styles.texts}>
              <Text style={styles.title}>{t(section.title)}</Text>
              <Text style={styles.hint}>{t(section.hint, { name })}</Text>
            </View>

            <View style={styles.valueBlock}>
              <Text style={styles.value}>{section.value}</Text>
              {section.caption ? (
                <Text style={styles.caption}>
                  {section.delta ? (
                    <Text
                      style={[
                        styles.delta,
                        { color: section.delta.direction === 'up' ? Palette.ok : Palette.warn },
                      ]}>
                      {section.delta.text}{' '}
                    </Text>
                  ) : null}
                  {t(section.caption)}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </MarketplaceShell>
  );
}

/** Заливка выделенной плитки: цвет маркетплейса в 5 % поверх белого. */
function tint(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel * 0.05 + 255 * 0.95);
  const r = mix((value >> 16) & 255);
  const g = mix((value >> 8) & 255);
  const b = mix(value & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  heading: {
    alignSelf: 'flex-start',
    paddingTop: 16,
    paddingBottom: 12,
  },
  eyebrow: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Palette.muted,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },

  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    padding: 15,
    marginBottom: 9,
  },
  tilePressed: {
    opacity: 0.85,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '600',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
    color: Palette.ink,
  },
  hint: {
    fontSize: 11.5,
    color: Palette.muted,
    marginTop: 2,
  },
  valueBlock: {
    alignItems: 'flex-end',
  },
  value: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.ink,
  },
  caption: {
    fontSize: 10,
    color: Palette.muted,
    marginTop: 1,
    textAlign: 'right',
  },
  delta: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    fontWeight: '500',
  },
});
