import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Appearance, Platform, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fmtDay, parseDay, ymd } from './budget';

export const palettes = {
  light: { bg: '#f4f5f7', card: '#ffffff', text: '#1b1f24', muted: '#6b7280', primary: '#2563eb', danger: '#dc2626', ok: '#16a34a', line: '#e5e7eb' },
  dark: { bg: '#0b0f17', card: '#161b26', text: '#e6e8ec', muted: '#9aa3b2', primary: '#3b82f6', danger: '#f87171', ok: '#4ade80', line: '#2a3140' },
};

const makeStyles = (c) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: c.card, borderRadius: 12, padding: 16, gap: 8 },
  input: { borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12, fontSize: 16, color: c.text },
  btn: { backgroundColor: c.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  track: { height: 8, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: c.text },
  h2: { fontSize: 16, fontWeight: '600', color: c.text, marginTop: 8 },
  muted: { color: c.muted },
  bold: { fontWeight: '600', color: c.text },
  empty: { color: c.muted, textAlign: 'center', padding: 24 },
});
const styles = { light: makeStyles(palettes.light), dark: makeStyles(palettes.dark) };

const THEME_KEY = 'theme';
const ThemeCtx = createContext(null);

// mode is the user's choice ('system' | 'light' | 'dark'); scheme is what's actually shown.
export function AppThemeProvider({ children }) {
  const [mode, setModeState] = useState('system');
  const system = useColorScheme() ?? 'light';

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((m) => m && setModeState(m)).catch(() => {});
  }, []);

  // Native override keeps alerts, keyboards and pickers in the same scheme. Web has no override.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme?.(mode === 'system' ? 'auto' : mode);
  }, [mode]);

  const setMode = (m) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
  };
  const scheme = mode === 'system' ? system : mode;
  return (
    <ThemeCtx.Provider value={{ mode, setMode, scheme, colors: palettes[scheme], s: styles[scheme] }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeCtx);

export const confirmDelete = (what, onYes) => {
  if (Platform.OS === 'web') return window.confirm(`Delete ${what}?`) && onYes();
  Alert.alert(`Delete ${what}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onYes },
  ]);
};

export const Card = ({ style, ...p }) => {
  const { s } = useAppTheme();
  return <View style={[s.card, style]} {...p} />;
};
export const Input = (p) => {
  const { s, colors, scheme } = useAppTheme();
  return <TextInput placeholderTextColor={colors.muted} keyboardAppearance={scheme} style={s.input} {...p} />;
};
export const Button = ({ title, onPress, disabled }) => {
  const { s } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.btn, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={s.btnText}>{title}</Text>
    </Pressable>
  );
};
// Segmented single-choice control; wraps to rows of three when there are many options. options: [[value, label], ...]
export const Segmented = ({ options, value, onChange }) => {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ flexGrow: 1, flexBasis: '30%', padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center',
              backgroundColor: on ? colors.primary : 'transparent', borderColor: on ? colors.primary : colors.line }}>
            <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '600' }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};
export const Bar = ({ ratio }) => {
  const { s, colors } = useAppTheme();
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: ratio > 1 ? colors.danger : colors.primary }]} />
    </View>
  );
};
export const Row = ({ label, value, color }) => {
  const { s } = useAppTheme();
  return <View style={s.row}><Text style={s.muted}>{label}</Text><Text style={[s.bold, color && { color }]}>{value}</Text></View>;
};
export const ErrorText = ({ children }) => {
  const { colors } = useAppTheme();
  return children ? <Text style={{ color: colors.danger }}>{children}</Text> : null;
};
// Text button, or an Ionicons icon when `icon` is given (title is then its accessibility label).
export const HeaderButton = ({ title, icon, onPress }) => {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} hitSlop={8} style={{ paddingHorizontal: 8 }}>
      {icon
        ? <Ionicons name={icon} size={26} color={colors.primary} />
        : <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{title}</Text>}
    </Pressable>
  );
};
// Date input on 'YYYY-MM-DD' strings ('' = unset). The Expo picker has no web build, so web uses the browser's own date input.
export const DateField = ({ value, onChange, placeholder, clearable, min, max }) => {
  const { s, colors, scheme } = useAppTheme();
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <input type="date" value={value} min={min} max={max} aria-label={placeholder} onChange={(e) => onChange(e.target.value)}
        style={{ padding: 12, fontSize: 16, borderRadius: 8, border: `1px solid ${colors.line}`, color: colors.text,
          background: 'transparent', colorScheme: scheme, fontFamily: 'inherit' }} />
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={[s.row, { gap: 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={placeholder} onPress={() => setOpen(!open)} style={[s.input, { flex: 1 }]}>
          <Text style={{ fontSize: 16, color: value ? colors.text : colors.muted }}>{value ? fmtDay(value) : placeholder}</Text>
        </Pressable>
        {clearable && !!value && <HeaderButton title="Clear" onPress={() => onChange('')} />}
      </View>
      {/* Android shows a dialog on mount; iOS shows an inline calendar until a day is picked. */}
      {open && (
        <DateTimePicker mode="date" value={value ? parseDay(value) : new Date()}
          minimumDate={min ? parseDay(min) : undefined} maximumDate={max ? parseDay(max) : undefined}
          onValueChange={(_, d) => { setOpen(false); onChange(ymd(d)); }} onDismiss={() => setOpen(false)} />
      )}
    </View>
  );
};
