import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useWallets } from '../../../lib/store';
import { allotted, dayOf, money, relDay, spent } from '../../../lib/budget';
import { BudgetForm } from '../../../lib/forms';
import { Bar, Button, Card, Forecast, HeaderButton, Stat, confirmDelete, useAppTheme } from '../../../lib/ui';

export default function Budget() {
  const { walletId, budgetId } = useLocalSearchParams();
  const { wallets, loading, removeExpense, updateBudget } = useWallets();
  const { s, colors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const w = wallets.find((x) => x.id === walletId);
  const b = w?.budgets.find((x) => x.id === budgetId);
  if (!b) return <Text style={s.empty}>{loading ? 'Loading…' : 'Budget not found.'}</Text>;
  const a = allotted(w, b);
  const sp = spent(b);

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.list}
      keyboardShouldPersistTaps="handled"
      data={[...b.expenses].sort((x, y) => dayOf(y.date).localeCompare(dayOf(x.date)))}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <Stack.Screen options={{
            title: b.name,
            headerRight: () => <HeaderButton title={editing ? 'Cancel' : 'Edit'} onPress={() => setEditing(!editing)} />,
          }} />
          {editing && (
            <Card>
              <Text style={s.label}>Edit budget</Text>
              <BudgetForm wallet={w} budget={b} submitLabel="Save" onSubmit={(p) => { updateBudget(w.id, b.id, p); setEditing(false); }} />
            </Card>
          )}
          <Card>
            <Text style={s.label}>{w.name}{b.mode === 'percent' ? ` · ${b.value}% of wallet` : ''}</Text>
            <View>
              <Text style={[s.big, a - sp < 0 && { color: colors.danger }]}>{money(a - sp)}</Text>
              <Text style={s.muted}>left of {money(a)}</Text>
            </View>
            <Bar ratio={a ? sp / a : 0} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Stat label="Spent" value={money(sp)} />
              <Stat label="Expenses" value={String(b.expenses.length)} />
              <Stat label="Used" value={`${a ? Math.round((sp / a) * 100) : 0}%`} />
            </View>
          </Card>
          <Forecast w={w} expenses={b.expenses} total={a} />
          <Button title="Add expense" onPress={() => router.push(`/expense?budget=${b.id}`)} />
          <Text style={s.h2}>Expenses</Text>
        </View>
      }
      ListEmptyComponent={<Text style={s.empty}>No expenses yet.</Text>}
      renderItem={({ item: e }) => (
        <Pressable onPress={() => router.push(`/expense?edit=${e.id}`)}
          onLongPress={() => confirmDelete(`expense "${e.note}"`, () => removeExpense(w.id, b.id, e.id))}>
          <View style={[s.item, s.row]}>
            <View style={{ flex: 1 }}>
              <Text style={s.bold} numberOfLines={1}>{e.note}</Text>
              <Text style={s.tiny}>{relDay(dayOf(e.date))}</Text>
            </View>
            <Text style={s.bold}>-{money(e.amount)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
