import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalletsProvider, useWallets } from '../lib/store';
import { AppThemeProvider, useAppTheme } from '../lib/ui';

// Shown for 5 seconds after a delete. Sits above the tab bar.
function UndoBar() {
  const { undo, restore, dismissUndo } = useWallets();
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(dismissUndo, 5000);
    return () => clearTimeout(t);
  }, [undo]);
  if (!undo) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 12, right: 12, bottom: bottom + 64, flexDirection: 'row',
      alignItems: 'center', gap: 12, backgroundColor: colors.text, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 }}>
      <Text style={{ flex: 1, color: colors.bg, fontSize: 14 }} numberOfLines={1}>{undo.label}</Text>
      <Pressable accessibilityRole="button" onPress={restore} hitSlop={12}>
        <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 14 }}>UNDO</Text>
      </Pressable>
    </View>
  );
}

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
      <UndoBar />
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
