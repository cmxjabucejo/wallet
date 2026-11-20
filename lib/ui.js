import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Appearance, Platform, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fmtDay, fmtShort, forecast, lastsLabel, money, parseDay, timeline, ymd } from './budget';

export const palettes = {
  light: { bg: '#f4f5f7', card: '#ffffff', text: '#1b1f24', muted: '#6b7280', primary: '#2563eb', danger: '#dc2626', ok: '#16a34a', line: '#e5e7eb' },
  dark: { bg: '#0b0f17', card: '#161b26', text: '#e6e8ec', muted: '#9aa3b2', primary: '#3b82f6', danger: '#f87171', ok: '#4ade80', line: '#2a3140' },
};

const hair = StyleSheet.hairlineWidth;
const num = { fontVariant: ['tabular-nums'] };
const makeStyles = (c) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  list: { padding: 12, gap: 8, paddingBottom: 32 },
  card: { backgroundColor: c.card, borderRadius: 12, padding: 14, gap: 10, borderWidth: hair, borderColor: c.line },
  item: { backgroundColor: c.card, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, gap: 6, borderWidth: hair, borderColor: c.line },
  input: { borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: c.text },
  btn: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  track: { height: 6, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '600', color: c.text },
  label: { fontSize: 11, fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  h2: { fontSize: 11, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6, marginLeft: 2 },
  stat: { fontSize: 16, fontWeight: '700', color: c.text, ...num },
  big: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5, ...num },
  muted: { color: c.muted, fontSize: 13 },
  tiny: { color: c.muted, fontSize: 11 },
  bold: { fontWeight: '600', color: c.text, ...num },
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
            style={{ flexGrow: 1, flexBasis: '30%', paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center',
              backgroundColor: on ? colors.primary : 'transparent', borderColor: on ? colors.primary : colors.line }}>
            <Text numberOfLines={1} style={{ color: on ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
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
        ? <Ionicons name={icon} size={24} color={colors.primary} />
        : <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>{title}</Text>}
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
        style={{ padding: 10, fontSize: 15, borderRadius: 8, border: `1px solid ${colors.line}`, color: colors.text,
          background: 'transparent', colorScheme: scheme, fontFamily: 'inherit' }} />
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={[s.row, { gap: 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={placeholder} onPress={() => setOpen(!open)} style={[s.input, { flex: 1 }]}>
          <Text style={{ fontSize: 15, color: value ? colors.text : colors.muted }}>{value ? fmtDay(value) : placeholder}</Text>
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

export const Stat = ({ label, value, sub, color }) => {
  const { s } = useAppTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={s.label} numberOfLines={1}>{label}</Text>
      <Text style={[s.stat, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {!!sub && <Text style={s.tiny} numberOfLines={1}>{sub}</Text>}
    </View>
  );
};

// Wallet phase badge: Active / Upcoming / Ended.
export const Chip = ({ phase }) => {
  const { colors } = useAppTheme();
  const c = { Active: colors.ok, Upcoming: colors.primary, Ended: colors.muted }[phase];
  return (
    <Text style={{ color: c, backgroundColor: c + '22', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' }}>
      {phase}
    </Text>
  );
};

// Cumulative spend per day: solid bars are actual, faded bars are projected, the line is the limit.
const CHART_H = 110;
const ProjectionChart = ({ w, f, limit }) => {
  const { s, colors } = useAppTheme();
  const max = Math.max(limit, ...f.points.map((p) => p.value)) || 1;
  const dot = (color, opacity = 1) => <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, opacity }} />;
  return (
    <View style={{ gap: 6 }} accessible
      accessibilityLabel={`Spending chart: ${money(f.used)} spent, ${money(f.projected)} projected by ${fmtShort(w.end)}, limit ${money(limit)}`}>
      <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: f.points.length > 45 ? 0 : 2 }}>
        {f.points.map((p) => (
          <View key={p.day} style={{ flex: 1, height: Math.max(1, (p.value / max) * CHART_H), borderTopLeftRadius: 2, borderTopRightRadius: 2,
            backgroundColor: p.value > limit + 0.005 ? colors.danger : colors.primary, opacity: p.future ? 0.3 : 1 }} />
        ))}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: (limit / max) * CHART_H, height: 1, backgroundColor: colors.danger, opacity: 0.7 }} />
      </View>
      <View style={s.row}>
        <Text style={s.tiny}>{fmtShort(w.start)}</Text>
        <Text style={s.tiny}>{fmtShort(w.end)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>{dot(colors.primary)}<Text style={s.tiny}>Spent</Text></View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>{dot(colors.primary, 0.3)}<Text style={s.tiny}>Projected</Text></View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <View style={{ width: 12, height: 1, backgroundColor: colors.danger }} /><Text style={s.tiny}>Limit {money(limit)}</Text>
        </View>
      </View>
    </View>
  );
};

// Projection card for `total` money spent through `expenses` over w's range. Renders nothing for wallets without a range.
export const Forecast = ({ w, expenses, total, title = 'Projection' }) => {
  const { s, colors } = useAppTheme();
  const f = forecast(w, expenses, total);
  if (!f) return null;
  const short = f.rate > 0 && f.lasts < f.daysToEnd;
  const verdict =
    f.left <= 0 ? [`Over by ${money(-f.left)}.`, colors.danger]
      : f.phase === 'Ended' ? [`Period ended with ${money(f.left)} unspent.`, colors.muted]
        : f.rate === 0 ? ['No spending yet. The full amount is available.', colors.muted]
          : short ? [`At this pace it runs out ${fmtShort(f.runOut)}, ${f.daysToEnd - f.lasts} days early. Keep to ${money(f.left / f.daysToEnd)}/day to make it.`, colors.danger]
            : [`On track. About ${money(total - f.projected)} left on ${fmtShort(w.end)}.`, colors.ok];
  return (
    <Card>
      <View style={s.row}>
        <Text style={s.label}>{title}</Text>
        <Text style={s.tiny}>{timeline(w, f)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Lasts" color={f.left <= 0 || short ? colors.danger : undefined}
          value={f.left <= 0 ? '0 days' : f.rate > 0 ? `${f.lasts} days` : '—'}
          sub={f.runOut && f.left > 0 ? `until ${fmtShort(f.runOut)}` : lastsLabel(f)} />
        <Stat label="Daily avg" value={money(f.rate)} sub={`over ${f.elapsed} days`} />
        <Stat label="Projected" value={money(f.projected)} color={f.projected > total + 0.005 ? colors.danger : undefined}
          sub={`${Math.round((f.projected / (total || 1)) * 100)}% of limit`} />
      </View>
      <ProjectionChart w={w} f={f} limit={total} />
      <Text style={{ color: verdict[1], fontSize: 13 }}>{verdict[0]}</Text>
    </Card>
  );
};
