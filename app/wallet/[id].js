import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useWallets } from '../../lib/store';
import { allotted, fmtShort, forecast, lastsLabel, money, nextWallet, parseAmount, spent, summary, today, walletExpenses } from '../../lib/budget';
import { BudgetForm, WalletForm } from '../../lib/forms';
import { Bar, Button, Card, Chip, ErrorText, Forecast, HeaderButton, Input, Row, Stat, useAppTheme } from '../../lib/ui';

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
                <Text style={s.muted}>left of {money(sum.spendable)}</Text>
              </View>
              <Bar ratio={sum.totalSpent / (sum.spendable || 1)} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Stat label="Spent" value={money(sum.totalSpent)} />
                {sum.reserved > 0 && <Stat label="Saved" value={money(sum.reserved)} color={colors.ok} />}
                <Stat label="Allotted" value={money(sum.totalAllotted)} />
                <Stat label="Unallocated" value={money(sum.unallocated)} />
              </View>
            </Card>
          )}
          <Extras w={w} />
          <Forecast w={w} expenses={walletExpenses(w)} total={sum.spendable} />
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
      ListFooterComponent={<View style={{ height: 56 }} />}
      ListEmptyComponent={!adding && <Text style={s.empty}>No budgets yet. Tap Add to create one.</Text>}
      renderItem={({ item: b }) => {
        const a = allotted(w, b);
        const sp = spent(b);
        const f = forecast(w, b.expenses, a);
        return (
          <Pressable onPress={() => router.push(`/budget/${w.id}/${b.id}`)}
            onLongPress={() => removeBudget(w.id, b)}>
            <View style={s.item}>
              <View style={s.row}>
                <Text style={[s.title, { flexShrink: 1 }]} numberOfLines={1}>{b.name}</Text>
                {b.savings && <Text style={{ color: colors.ok, fontSize: 11, fontWeight: '700' }}>SAVINGS</Text>}
                <View style={{ flex: 1 }} />
                <Text style={[s.bold, a - sp < 0 && { color: colors.danger }]}>{money(a - sp)} {b.savings ? 'set aside' : 'left'}</Text>
              </View>
              <Bar ratio={a ? sp / a : 0} />
              <Text style={s.tiny}>
                {money(sp)} of {money(a)}{b.mode === 'percent' ? ` (${b.value}%)` : ''}
                {f && f.phase === 'Active' && !b.savings ? ` · ${lastsLabel(f)}` : ''}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

// Income added during the period, money carried in or out, and the carry-over button once the period has ended.
function Extras({ w }) {
  const { wallets, addExtra, removeExtra, rollover } = useWallets();
  const { s, colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const extras = w.extras ?? [];
  const left = Math.round(summary(w).remaining * 100) / 100;
  const next = w.start && w.end < today() ? nextWallet(wallets, w) : null;

  const add = () => {
    const n = parseAmount(amount);
    if (!(n > 0)) return setError('Enter an amount greater than 0.');
    addExtra(w.id, note.trim() || 'Income', n);
    setNote(''); setAmount(''); setError(null); setOpen(false);
  };

  return (
    <Card>
      <View style={s.row}>
        <Text style={s.label}>Income & carry-over</Text>
        <HeaderButton title={open ? 'Cancel' : 'Add'} onPress={() => setOpen(!open)} />
      </View>
      {extras.map((x) => (
        <Pressable key={x.id} onLongPress={() => removeExtra(x)}>
          <Row label={`${x.note} · ${fmtShort(x.date)}`} value={`${x.amount < 0 ? '-' : '+'}${money(Math.abs(x.amount))}`}
            color={x.amount > 0 ? colors.ok : undefined} />
        </Pressable>
      ))}
      {!open && <Text style={s.tiny}>{extras.length ? 'Long-press an entry to delete it.' : 'Income or refunds received during this period.'}</Text>}
      {open && (
        <>
          <Input placeholder="What is it? e.g. Bonus" value={note} onChangeText={setNote} />
          <Input placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <ErrorText>{error}</ErrorText>
          <Button title="Add money" onPress={add} />
        </>
      )}
      {next && left > 0 && <Button title={`Carry ${money(left)} to ${next.name}`} onPress={() => rollover(w, next, left)} />}
    </Card>
  );
}
