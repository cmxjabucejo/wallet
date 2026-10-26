import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WalletsProvider } from '../lib/store';
import { AppThemeProvider, useAppTheme } from '../lib/ui';

function Navigator() {
  const { scheme, colors } = useAppTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.line },
  };
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="new-wallet" options={{ title: 'New wallet', presentation: 'modal' }} />
        <Stack.Screen name="expense" options={{ title: 'Expense', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function Layout() {
  return (
    <AppThemeProvider>
      <WalletsProvider>
        <Navigator />
      </WalletsProvider>
    </AppThemeProvider>
  );
}
