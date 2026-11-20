import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useWallets } from '../../lib/store';
import { allotted, fmtShort, forecast, lastsLabel, money, spent, summary, walletExpenses } from '../../lib/budget';
import { BudgetForm, WalletForm } from '../../lib/forms';
import { Bar, Card, Chip, Forecast, HeaderButton, Stat, confirmDelete, useAppTheme } from '../../lib/ui';

export default function Wallet() {
  const { id } = useLocalSearchParams();
  const { wallets, loading, addBudget, removeBudget, updateWallet } = useWallets();
  const { s, colors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const w = wallets.find((x) => x.id === id);
  if (!w) return <Text style={s.empty}>{loading ? 'Loading…' : 'Wallet not found.'}</Text>;
  const sum = summary(w);
  const phase = forecast(w, [], 0)?.phase;

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.list}
      keyboardShouldPersistTaps="handled"
      data={w.budgets}
      keyExtractor={(b) => b.id}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <Stack.Screen options={{
            title: w.name,
            headerRight: () => <HeaderButton title={editing ? 'Cancel' : 'Edit'} onPress={() => setEditing(!editing)} />,
          }} />
          {editing ? (
            <Card>
              <Text style={s.label}>Edit wallet</Text>
              <WalletForm wallet={w} submitLabel="Save" onSubmit={(p) => { updateWallet(w.id, p); setEditing(false); }} />
            </Card>
          ) : (
            <Card>
              <View style={s.row}>
                <Text style={s.label}>{w.start ? `${fmtShort(w.start)} – ${fmtShort(w.end)}` : 'No date range'}</Text>
                {phase && <Chip phase={phase} />}
              </View>
              <View>
                <Text style={[s.big, sum.remaining < 0 && { color: colors.danger }]}>{money(sum.remaining)}</Text>
                <Text style={s.muted}>left of {money(w.amount)}</Text>
              </View>
              <Bar ratio={sum.totalSpent / w.amount} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Stat label="Spent" value={money(sum.totalSpent)} />
                <Stat label="Allotted" value={money(sum.totalAllotted)} />
                <Stat label="Unallocated" value={money(sum.unallocated)} />
              </View>
            </Card>
          )}
          <Forecast w={w} expenses={walletExpenses(w)} total={w.amount} />
          <View style={s.row}>
            <Text style={s.h2}>Budgets</Text>
            <HeaderButton title={adding ? 'Cancel' : 'Add'} onPress={() => setAdding(!adding)} />
          </View>
          {adding && (
            <Card>
              <BudgetForm wallet={w} submitLabel="Add budget" onSubmit={(b) => { addBudget(w.id, b); setAdding(false); }} />
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={!adding && <Text style={s.empty}>No budgets yet. Tap Add to create one.</Text>}
      renderItem={({ item: b }) => {
        const a = allotted(w, b);
        const sp = spent(b);
        const f = forecast(w, b.expenses, a);
        return (
          <Pressable onPress={() => router.push(`/budget/${w.id}/${b.id}`)}
            onLongPress={() => confirmDelete(`budget "${b.name}"`, () => removeBudget(w.id, b.id))}>
            <View style={s.item}>
              <View style={s.row}>
                <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>{b.name}</Text>
                <Text style={[s.bold, a - sp < 0 && { color: colors.danger }]}>{money(a - sp)} left</Text>
              </View>
              <Bar ratio={a ? sp / a : 0} />
              <Text style={s.tiny}>
                {money(sp)} of {money(a)}{b.mode === 'percent' ? ` (${b.value}%)` : ''}
                {f && f.phase === 'Active' ? ` · ${lastsLabel(f)}` : ''}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
