import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider } from '@/lib/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <LanguageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Заголовки выключены для всего стека: экраны рисуют свою шапку сами.
            Перечислять экраны поимённо нельзя — объявление вложенного
            навигатора marketplace/[id] создаёт второй экран на тот же путь,
            и роутер падает с «conflicting screens». */}
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </ThemeProvider>
    </LanguageProvider>
  );
}
