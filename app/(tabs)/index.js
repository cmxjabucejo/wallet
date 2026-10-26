import { FlatList, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { useWallets } from '../../lib/store';
import { fmtDay, money, summary } from '../../lib/budget';
import { Bar, Card, Row, confirmDelete, useAppTheme } from '../../lib/ui';

export default function Wallets() {
  const { wallets, loading, removeWallet } = useWallets();
  const { s } = useAppTheme();

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.list}
      data={wallets}
      keyExtractor={(w) => w.id}
      ListEmptyComponent={<Text style={s.empty}>{loading ? 'Loading…' : 'No wallets yet. Tap + to add one.'}</Text>}
      renderItem={({ item: w }) => {
        const sum = summary(w);
        return (
          <Pressable onPress={() => router.push(`/wallet/${w.id}`)}
            onLongPress={() => confirmDelete(`wallet "${w.name}"`, () => removeWallet(w.id))}>
            <Card>
              <Text style={s.title}>{w.name}</Text>
              {!!w.start && <Text style={s.muted}>{fmtDay(w.start)} – {fmtDay(w.end)}</Text>}
              <Row label="Initial" value={money(w.amount)} />
              <Row label="Remaining" value={money(sum.remaining)} />
              <Bar ratio={sum.totalSpent / w.amount} />
              <Text style={s.muted}>{w.budgets.length} budget(s) · long-press to delete</Text>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
