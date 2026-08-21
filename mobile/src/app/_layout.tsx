import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SettingsProvider } from '@/contexts/settings-context';
import { migrateDbIfNeeded } from '@/db/schema';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <SQLiteProvider databaseName="ballpark-log.db" onInit={migrateDbIfNeeded}>
        <SettingsProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="record/new" options={{ presentation: 'modal', title: '기록 추가' }} />
            <Stack.Screen name="record/[id]" options={{ title: '기록 상세' }} />
          </Stack>
        </SettingsProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
