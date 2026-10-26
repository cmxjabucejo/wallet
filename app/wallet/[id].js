import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useWallets } from '../../lib/store';
import { allotted, fmtDay, money, spent, summary } from '../../lib/budget';
import { BudgetForm, WalletForm } from '../../lib/forms';
import { Bar, Card, HeaderButton, Row, confirmDelete, useAppTheme } from '../../lib/ui';

export default function Wallet() {
  const { id } = useLocalSearchParams();
  const { wallets, loading, addBudget, removeBudget, updateWallet } = useWallets();
  const { s, colors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const w = wallets.find((x) => x.id === id);
  if (!w) return <Text style={s.empty}>{loading ? 'Loading…' : 'Wallet not found.'}</Text>;
  const sum = summary(w);

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.list}
      keyboardShouldPersistTaps="handled"
      data={w.budgets}
      keyExtractor={(b) => b.id}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Stack.Screen options={{
            title: w.name,
            headerRight: () => <HeaderButton title={editing ? 'Cancel' : 'Edit'} onPress={() => setEditing(!editing)} />,
          }} />
          {editing ? (
            <Card>
              <Text style={s.title}>Edit wallet</Text>
              <WalletForm wallet={w} submitLabel="Save" onSubmit={(p) => { updateWallet(w.id, p); setEditing(false); }} />
            </Card>
          ) : (
            <Card>
              <Row label="Period" value={w.start ? `${fmtDay(w.start)} – ${fmtDay(w.end)}` : 'No date range'} />
              <Row label="Initial amount" value={money(w.amount)} />
              <Row label="Allotted to budgets" value={money(sum.totalAllotted)} />
              <Row label="Unallocated" value={money(sum.unallocated)} />
              <Row label="Spent" value={money(sum.totalSpent)} />
              <Row label="Remaining" value={money(sum.remaining)} color={sum.remaining < 0 ? colors.danger : colors.ok} />
            </Card>
          )}
          <Card>
            <Text style={s.title}>New budget</Text>
            <BudgetForm wallet={w} submitLabel="Add budget" onSubmit={(b) => addBudget(w.id, b)} />
          </Card>
          <Text style={s.h2}>Budgets</Text>
        </View>
      }
      ListEmptyComponent={<Text style={s.empty}>No budgets yet.</Text>}
      renderItem={({ item: b }) => {
        const a = allotted(w, b);
        const sp = spent(b);
        return (
          <Pressable onPress={() => router.push(`/budget/${w.id}/${b.id}`)}
            onLongPress={() => confirmDelete(`budget "${b.name}"`, () => removeBudget(w.id, b.id))}>
            <Card>
              <View style={s.row}>
                <Text style={s.title}>{b.name}</Text>
                <Text style={s.muted}>{b.mode === 'percent' ? `${b.value}%` : 'fixed'}</Text>
              </View>
              <Row label={`Spent ${money(sp)} of ${money(a)}`} value={`${money(a - sp)} left`} color={a - sp < 0 ? colors.danger : undefined} />
              <Bar ratio={a ? sp / a : 0} />
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
