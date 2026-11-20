import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useWallets } from '../../lib/store';
import { fmtShort, forecast, lastsLabel, money, summary, timeline, today, walletExpenses, walletFor } from '../../lib/budget';
import { Bar, Chip, Forecast, confirmDelete, useAppTheme } from '../../lib/ui';

export default function Wallets() {
  const { wallets, loading, removeWallet } = useWallets();
  const { s, colors } = useAppTheme();
  const current = walletFor(wallets, today());

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.list}
      data={wallets}
      keyExtractor={(w) => w.id}
      ListHeaderComponent={wallets.length > 0 && (
        <View style={{ gap: 8 }}>
          {current && <Forecast w={current} expenses={walletExpenses(current)} total={current.amount} title={`Now · ${current.name}`} />}
          <Text style={s.h2}>All wallets</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={s.empty}>{loading ? 'Loading…' : 'No wallets yet. Tap + to add one.'}</Text>}
      ListFooterComponent={wallets.length > 0 && <Text style={[s.tiny, { textAlign: 'center' }]}>Long-press a wallet to delete it</Text>}
      renderItem={({ item: w }) => {
        const sum = summary(w);
        const f = forecast(w, walletExpenses(w), w.amount);
        return (
          <Pressable onPress={() => router.push(`/wallet/${w.id}`)}
            onLongPress={() => confirmDelete(`wallet "${w.name}"`, () => removeWallet(w.id))}>
            <View style={s.item}>
              <View style={s.row}>
                <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>{w.name}</Text>
                {f && <Chip phase={f.phase} />}
              </View>
              <View style={[s.row, { alignItems: 'baseline' }]}>
                <Text style={[s.stat, sum.remaining < 0 && { color: colors.danger }]}>{money(sum.remaining)} left</Text>
                <Text style={s.muted}>of {money(w.amount)}</Text>
              </View>
              <Bar ratio={sum.totalSpent / w.amount} />
              <Text style={s.tiny}>
                {f ? `${fmtShort(w.start)} – ${fmtShort(w.end)} · ${timeline(w, f)}${f.phase === 'Active' ? ` · ${lastsLabel(f)}` : ''}` : 'No date range'}
                {` · ${w.budgets.length} budget${w.budgets.length === 1 ? '' : 's'}`}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
