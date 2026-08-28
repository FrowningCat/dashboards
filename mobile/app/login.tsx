import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/language-switch';
import { Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { API_BASE_URL, ApiError, signIn } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

/** Кому писать за доступом. Пока учётки заводит один человек — адрес здесь. */
const ADMIN_EMAIL = 'vsavinkov60@gmail.com';

type Field = 'identifier' | 'password';

export default function LoginScreen() {
  const { t } = useTranslation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<Field | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const filled = identifier.trim().length > 0 && password.length > 0;
  const canSubmit = filled && !submitting;

  function describe(cause: unknown): string {
    if (!(cause instanceof ApiError)) {
      return t('errorUnknown');
    }

    switch (cause.code) {
      case 'notConfigured':
        return t('errorNotConfigured');
      case 'invalidCredentials':
        return t('errorInvalidCredentials');
      case 'unreachable':
        // Адрес в тексте — чтобы не гадать, куда приложение стучалось.
        return t('errorUnreachable', { url: API_BASE_URL ?? '' });
      case 'serverError':
        return t('errorServer', { status: cause.detail ?? '' });
    }
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signIn(identifier.trim(), password);
    } catch (cause) {
      setError(describe(cause));
      setSubmitting(false);
      return;
    }

    // Экран сразу уходит из стека: возврат кнопкой «назад» на форму входа
    // после успешного входа выглядел бы как выход из аккаунта.
    router.replace('/marketplaces');
  }

  async function handleWriteToAdmin() {
    const url = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(t('mailSubject'))}`;

    try {
      await Linking.openURL(url);
    } catch {
      // На устройстве может не быть почтового приложения. Показываем адрес,
      // иначе человек упирается в молчащую кнопку и не знает, куда писать.
      setError(t('mailFailed', { email: ADMIN_EMAIL }));
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <LanguageSwitch />
      </View>

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.mark}>
            <Text style={styles.markText}>ШМ</Text>
          </View>

          <Text style={styles.title}>{t('title')}</Text>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('identifierLabel')}</Text>
            <TextInput
              style={[styles.input, focused === 'identifier' && styles.inputFocused]}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="v.savinkov"
              placeholderTextColor={Palette.dim}
              onFocus={() => setFocused('identifier')}
              onBlur={() => setFocused(null)}
              editable={!submitting}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('passwordLabel')}</Text>
            <TextInput
              ref={passwordRef}
              style={[styles.input, focused === 'password' && styles.inputFocused]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Palette.dim}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              editable={!submitting}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submit,
              !canSubmit && styles.submitDisabled,
              pressed && styles.submitPressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={Palette.paper} />
            ) : (
              <Text style={styles.submitText}>{t('submit')}</Text>
            )}
          </Pressable>

          {/* Ошибка ниже кнопки, а не выше: появившись, она не сдвигает
              кнопку из-под пальца в момент нажатия. */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleWriteToAdmin}
            hitSlop={12}
            style={({ pressed }) => [styles.helperButton, pressed && styles.helperPressed]}>
            <Text style={styles.helper}>{t('helper')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.appBg,
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  topBar: {
    paddingHorizontal: 18,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  mark: {
    width: 46,
    height: 46,
    borderRadius: Radius.mark,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  markText: {
    fontFamily: Fonts.mono,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.76,
    color: Palette.paper,
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 29,
    color: Palette.ink,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: Palette.muted,
    marginTop: 8,
  },

  field: {
    marginTop: 16,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Palette.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Palette.paper,
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.control,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: Palette.ink,
  },
  inputFocused: {
    borderColor: Palette.ink,
    boxShadow: '0 0 0 3px rgba(16, 19, 23, 0.10)',
  },

  submit: {
    marginTop: 22,
    backgroundColor: Palette.ink,
    borderRadius: Radius.control,
    padding: 15,
    alignItems: 'center',
    // Чтобы кнопка не прыгала при подмене текста на индикатор загрузки.
    minHeight: 52,
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitPressed: {
    opacity: 0.85,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.paper,
  },

  error: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Palette.warn,
    textAlign: 'center',
    marginTop: 12,
  },
  helperButton: {
    marginTop: 16,
  },
  helperPressed: {
    opacity: 0.6,
  },
  helper: {
    fontSize: 12.5,
    color: Palette.muted,
    textAlign: 'center',
  },
});
