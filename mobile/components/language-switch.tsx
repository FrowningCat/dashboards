import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/design';
import { LANGUAGE_LABELS, LANGUAGES, useTranslation } from '@/lib/i18n';

/**
 * Переключатель языка. Стоит в шапке каждого экрана, поэтому и живёт
 * отдельным компонентом: разметка с подписями языков нужна в одном месте.
 *
 * Оформление — сегменты из макета: неактивный прозрачный на общей подложке,
 * активный залит чёрным.
 */
export function LanguageSwitch() {
  const { language, setLanguage } = useTranslation();

  return (
    <View style={styles.container}>
      {LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <Pressable
            key={code}
            onPress={() => setLanguage(code)}
            style={[styles.option, active && styles.optionActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {LANGUAGE_LABELS[code]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: Palette.field,
    borderRadius: Radius.control,
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: Palette.ink,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.muted,
  },
  labelActive: {
    fontWeight: '600',
    color: Palette.paper,
  },
});
