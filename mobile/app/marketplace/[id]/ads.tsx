import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { MarketplaceShell } from '@/components/marketplace-shell';
import { Palette } from '@/constants/design';
import { useTranslation } from '@/lib/i18n';
import { isMarketplaceId } from '@/lib/marketplaces';

export default function MarketplaceAdsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!isMarketplaceId(id)) {
    return <Redirect href="/marketplaces" />;
  }

  return (
    <MarketplaceShell id={id} active="ads">
      <View style={styles.content}>
        <Text style={styles.title}>{t('tabAds')}</Text>
        <Text style={styles.hint}>{t('sectionEmpty')}</Text>
      </View>
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.19,
    color: Palette.ink,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 8,
  },
});
