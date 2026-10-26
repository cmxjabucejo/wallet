import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useWallets } from '../../../lib/store';
import { allotted, dayOf, fmtDay, money, spent } from '../../../lib/budget';
import { BudgetForm } from '../../../lib/forms';
import { Bar, Button, Card, HeaderButton, Row, confirmDelete, useAppTheme } from '../../../lib/ui';

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
        <View style={{ gap: 12 }}>
          <Stack.Screen options={{
            title: b.name,
            headerRight: () => <HeaderButton title={editing ? 'Cancel' : 'Edit'} onPress={() => setEditing(!editing)} />,
          }} />
          {editing && (
            <Card>
              <Text style={s.title}>Edit budget</Text>
              <BudgetForm wallet={w} budget={b} submitLabel="Save" onSubmit={(p) => { updateBudget(w.id, b.id, p); setEditing(false); }} />
            </Card>
          )}
          <Card>
            <Row label="Allotted" value={money(a)} />
            <Row label="Spent" value={money(sp)} />
            <Row label="Left" value={money(a - sp)} color={a - sp < 0 ? colors.danger : colors.ok} />
            <Bar ratio={a ? sp / a : 0} />
          </Card>
          <Button title="Add expense" onPress={() => router.push(`/expense?budget=${b.id}`)} />
          <Text style={s.h2}>Expenses</Text>
        </View>
      }
      ListEmptyComponent={<Text style={s.empty}>No expenses yet.</Text>}
      renderItem={({ item: e }) => (
        <Pressable onPress={() => router.push(`/expense?edit=${e.id}`)}
          onLongPress={() => confirmDelete(`expense "${e.note}"`, () => removeExpense(w.id, b.id, e.id))}>
          <Card style={s.row}>
            <View>
              <Text style={s.bold}>{e.note}</Text>
              <Text style={s.muted}>{fmtDay(dayOf(e.date))}</Text>
            </View>
            <Text style={s.bold}>-{money(e.amount)}</Text>
          </Card>
        </Pressable>
      )}
    />
  );
}
