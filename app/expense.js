import { useState } from 'react';
import { Image, ScrollView, Switch, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useWallets } from '../lib/store';
import { allotted, budgetAlert, defaultDay, expenseRows, isDay, money, parseAmount, spent, summary, walletFor } from '../lib/budget';
import { notify, photosSupported, pickPhoto } from '../lib/device';
import { Button, Card, DateField, ErrorText, HeaderButton, Input, Row, Segmented, useAppTheme } from '../lib/ui';

// Modal to add or edit an expense. ?edit=<expenseId> edits; ?budget=<budgetId> preselects a category.
// The date picks the wallet and the wallet's budgets are the categories, so a new date can move an expense.
export default function ExpenseModal() {
  const { edit, budget } = useLocalSearchParams();
  const { wallets, loading } = useWallets();
  const { s } = useAppTheme();
  if (loading) return <Text style={s.empty}>Loading…</Text>;
  const editing = edit ? expenseRows(wallets).find((r) => r.e.id === edit) : null;
  if (edit && !editing) return <Text style={s.empty}>Expense not found.</Text>;
  const preset = budget ? wallets.find((w) => w.budgets.some((b) => b.id === budget)) : null;
  return <ExpenseForm editing={editing} presetWallet={preset} presetBudget={preset && budget} />;
}

function ExpenseForm({ editing, presetWallet, presetBudget }) {
  const { wallets, addExpense, updateExpense } = useWallets();
  const { s, colors } = useAppTheme();
  const [date, setDate] = useState(editing?.day ?? defaultDay(presetWallet));
  const [amount, setAmount] = useState(editing ? String(editing.e.amount) : '');
  const [note, setNote] = useState(editing?.e.note ?? '');
  const [bid, setBid] = useState(editing?.b.id ?? presetBudget ?? null);
  const [recurring, setRecurring] = useState(editing?.e.recurring ?? false);
  const [photo, setPhoto] = useState(editing?.e.photo ?? null);
  const [error, setError] = useState(null);

  const w = isDay(date) ? walletFor(wallets, date) : null;
  const b = w?.budgets.find((x) => x.id === bid);
  const n = parseAmount(amount);
  // While editing, the expense's old amount is still counted in its budget, so add it back.
  const left = b ? allotted(w, b) - spent(b) + (editing?.b.id === b.id ? editing.e.amount : 0) : 0;

  const save = () => {
    if (!isDay(date)) return setError('Pick a date.');
    if (!w) return setError('No wallet covers this date. Give a wallet a date range first.');
    if (!b) return setError('Pick a category.');
    if (!(n > 0)) return setError('Enter an amount greater than 0.');
    const fields = { note: note.trim() || b.name, amount: n, date, recurring, photo };
    if (editing) updateExpense(editing.w.id, editing.b.id, editing.e.id, { wid: w.id, bid: b.id, ...fields });
    else addExpense(w.id, b.id, fields);
    const limit = allotted(w, b);
    const msg = budgetAlert(b.name, limit, limit - left, limit - left + n);
    if (msg && !b.savings) notify('Budget alert', msg); // savings withdrawals aren't overspending
    router.back();
  };

  const attach = async (camera) => {
    try {
      const uri = await pickPhoto(camera);
      if (uri) setPhoto(uri);
    } catch {
      setError("Couldn't attach the photo.");
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: editing ? 'Edit expense' : 'New expense' }} />
      <Card>
        <DateField placeholder="Date" value={date} onChange={setDate} />
        {w ? (
          <>
            <Row label={`Wallet: ${w.name}`} value={`${money(summary(w).remaining)} left`} />
            {w.budgets.length ? (
              <Segmented options={w.budgets.map((x) => [x.id, x.name])} value={bid} onChange={setBid} />
            ) : (
              <Text style={s.muted}>This wallet has no budgets yet. Add some to use as categories.</Text>
            )}
            {b && (
              <Text style={{ color: n > left ? colors.danger : colors.muted }}>
                {money(left)} left in {b.name}{n > 0 ? ` → ${money(left - n)} after this` : ''}
              </Text>
            )}
          </>
        ) : (
          <Text style={s.muted}>{isDay(date) ? 'No wallet covers this date.' : 'Pick a date to find its wallet.'}</Text>
        )}
        <Input placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <Input placeholder="What for? (optional)" value={note} onChangeText={setNote} />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Repeats every period</Text>
            <Text style={s.tiny}>Copied into the next wallet when you add a budget with the same name.</Text>
          </View>
          <Switch value={recurring} onValueChange={setRecurring} accessibilityLabel="Repeats every period" />
        </View>
        {photosSupported && (photo ? (
          <View style={{ gap: 6 }}>
            <Image source={{ uri: photo }} style={{ width: '100%', height: 220, borderRadius: 8 }} resizeMode="contain"
              accessibilityLabel="Receipt photo" />
            <HeaderButton title="Remove photo" onPress={() => setPhoto(null)} />
          </View>
        ) : (
          <View style={[s.row, { justifyContent: 'flex-start' }]}>
            <HeaderButton title="Take photo" onPress={() => attach(true)} />
            <HeaderButton title="Choose photo" onPress={() => attach(false)} />
          </View>
        ))}
        <ErrorText>{error}</ErrorText>
        <Button title={editing ? 'Save changes' : 'Add expense'} onPress={save} />
      </Card>
    </ScrollView>
  );
}
