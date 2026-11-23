import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useWallets } from '../../lib/store';
import { allotted, expenseRows, money, prevWallet, relDay, spent, summary, walletExpenses } from '../../lib/budget';
import { Bar, Card, CategoryPie, Compare, ExpenseMarks, Forecast, Input, Row, Segmented, useAppTheme } from '../../lib/ui';

// All expenses across wallets. Adding and editing happen in the /expense modal.
export default function Expenses() {
  const { wallets, loading, removeExpense } = useWallets();
  const { s, colors } = useAppTheme();
  const [picked, setFilter] = useState('all');
  const [q, setQ] = useState('');
  // A deleted wallet's filter falls back to All.
  const filter = wallets.some((x) => x.id === picked) ? picked : 'all';

  const all = expenseRows(wallets);
  const inWallet = filter === 'all' ? all : all.filter((r) => r.w.id === filter);
  const needle = q.trim().toLowerCase();
  const rows = needle ? inWallet.filter((r) => `${r.e.note} ${r.b.name}`.toLowerCase().includes(needle)) : inWallet;
  const total = rows.reduce((t, r) => t + r.e.amount, 0);
  const shown = wallets.find((x) => x.id === filter);
  const sum = shown && summary(shown);
  const prev = shown && prevWallet(wallets, shown);

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
            <Row label={`${needle ? `Matching "${q.trim()}"` : 'Spent'} (${rows.length} expense${rows.length === 1 ? '' : 's'})`} value={money(total)} />
            {shown && (
              <>
                <Row label="Wallet remaining" value={money(sum.remaining)} color={sum.remaining < 0 ? colors.danger : colors.ok} />
                <Bar ratio={sum.totalSpent / (sum.spendable || 1)} />
                {shown.budgets.map((y) => (
                  <Row key={y.id} label={y.name} value={`${money(spent(y))} / ${money(allotted(shown, y))}`}
                    color={spent(y) > allotted(shown, y) ? colors.danger : undefined} />
                ))}
              </>
            )}
          </Card>
          <CategoryPie wallets={shown ? [shown] : wallets} title={shown ? `Where it went · ${shown.name}` : 'Where it went · All wallets'} />
          {prev && <Compare w={shown} prev={prev} />}
          {shown && <Forecast w={shown} expenses={walletExpenses(shown)} total={sum.spendable} />}
          {inWallet.length > 0 && <Input placeholder="Search notes or categories" value={q} onChangeText={setQ} clearButtonMode="while-editing" />}
          {rows.length > 0 && <Text style={s.h2}>Tap to edit · long-press to delete</Text>}
        </View>
      }
      ListEmptyComponent={<Text style={s.empty}>{loading ? 'Loading…' : needle && inWallet.length ? 'No expenses match.' : 'No expenses yet. Tap + to add one.'}</Text>}
      ListFooterComponent={<View style={{ height: 56 }} />}
      renderItem={({ item: r }) => (
        <Pressable onPress={() => router.push(`/expense?edit=${r.e.id}`)}
          onLongPress={() => removeExpense(r.w.id, r.b.id, r.e)}>
          <View style={[s.item, s.row]}>
            <View style={{ flex: 1 }}>
              <Text style={s.bold} numberOfLines={1}>{r.e.note}</Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <Text style={[s.tiny, { flexShrink: 1 }]} numberOfLines={1}>{relDay(r.day)} · {r.w.name} › {r.b.name}</Text>
                <ExpenseMarks e={r.e} />
              </View>
            </View>
            <Text style={s.bold}>-{money(r.e.amount)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
