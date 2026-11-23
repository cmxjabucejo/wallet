import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useWallets } from '../../lib/store';
import { allotted, expenseRows, money, relDay, spent, walletExpenses } from '../../lib/budget';
import { Bar, Card, CategoryPie, Forecast, Row, Segmented, confirmDelete, useAppTheme } from '../../lib/ui';

// All expenses across wallets. Adding and editing happen in the /expense modal.
export default function Expenses() {
  const { wallets, loading, removeExpense } = useWallets();
  const { s, colors } = useAppTheme();
  const [filter, setFilter] = useState('all');

  const all = expenseRows(wallets);
  const rows = filter === 'all' ? all : all.filter((r) => r.w.id === filter);
  const total = rows.reduce((t, r) => t + r.e.amount, 0);
  const shown = wallets.find((x) => x.id === filter);

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.list}
      data={rows}
      keyExtractor={(r) => r.e.id}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          {wallets.length > 0 && (
            <Segmented options={[['all', 'All'], ...wallets.map((x) => [x.id, x.name])]} value={filter} onChange={setFilter} />
          )}
          <Card>
            <Row label={`Spent (${rows.length} expense${rows.length === 1 ? '' : 's'})`} value={money(total)} />
            {shown && (
              <>
                <Row label="Wallet remaining" value={money(shown.amount - total)} color={shown.amount < total ? colors.danger : colors.ok} />
                <Bar ratio={total / shown.amount} />
                {shown.budgets.map((y) => (
                  <Row key={y.id} label={y.name} value={`${money(spent(y))} / ${money(allotted(shown, y))}`}
                    color={spent(y) > allotted(shown, y) ? colors.danger : undefined} />
                ))}
              </>
            )}
          </Card>
          <CategoryPie wallets={shown ? [shown] : wallets} title={shown ? `Where it went · ${shown.name}` : 'Where it went · All wallets'} />
          {shown && <Forecast w={shown} expenses={walletExpenses(shown)} total={shown.amount} />}
          {rows.length > 0 && <Text style={s.h2}>Tap to edit · long-press to delete</Text>}
        </View>
      }
      ListEmptyComponent={<Text style={s.empty}>{loading ? 'Loading…' : 'No expenses yet. Tap + to add one.'}</Text>}
      renderItem={({ item: r }) => (
        <Pressable onPress={() => router.push(`/expense?edit=${r.e.id}`)}
          onLongPress={() => confirmDelete(`expense "${r.e.note}"`, () => removeExpense(r.w.id, r.b.id, r.e.id))}>
          <View style={[s.item, s.row]}>
            <View style={{ flex: 1 }}>
              <Text style={s.bold} numberOfLines={1}>{r.e.note}</Text>
              <Text style={s.tiny} numberOfLines={1}>{relDay(r.day)} · {r.w.name} › {r.b.name}</Text>
            </View>
            <Text style={s.bold}>-{money(r.e.amount)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
