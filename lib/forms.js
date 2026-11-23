import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useWallets } from './store';
import { allotted, amountError, budgetError, freeFor, money, parseAmount, rangeError } from './budget';
import { Button, DateField, ErrorText, Input, Segmented, useAppTheme } from './ui';

const MODES = [['percent', 'Percentage %'], ['amount', 'Amount']];

// Create a wallet (no `wallet`) or edit one. Create clears itself after submit.
export function WalletForm({ wallet, submitLabel, onSubmit }) {
  const { wallets } = useWallets();
  const [name, setName] = useState(wallet?.name ?? '');
  const [amount, setAmount] = useState(wallet ? String(wallet.amount) : '');
  const [start, setStart] = useState(wallet?.start ?? '');
  const [end, setEnd] = useState(wallet?.end ?? '');
  const [error, setError] = useState(null);

  const submit = () => {
    const n = parseAmount(amount);
    if (!name.trim()) return setError('Give the wallet a name.');
    const err = amountError(wallet ?? { budgets: [] }, n) || rangeError(wallets, wallet?.id, start, end);
    if (err) return setError(err);
    onSubmit({ name: name.trim(), amount: n, start, end });
    if (!wallet) { setName(''); setAmount(''); setStart(''); setEnd(''); }
    setError(null);
  };

  return (
    <>
      <Input placeholder="Name, e.g. October salary" value={name} onChangeText={setName} />
      <Input placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <DateField placeholder="Start date" value={start} onChange={setStart} max={end || undefined} />
      <DateField placeholder="End date" value={end} onChange={setEnd} min={start || undefined} />
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} />
    </>
  );
}

// Create a budget in `wallet` (no `budget`) or edit one.
export function BudgetForm({ wallet, budget, submitLabel, onSubmit }) {
  const { s } = useAppTheme();
  const [name, setName] = useState(budget?.name ?? '');
  const [mode, setMode] = useState(budget?.mode ?? 'percent');
  const [value, setValue] = useState(budget ? String(budget.value) : '');
  const [savings, setSavings] = useState(budget?.savings ?? false);
  const [error, setError] = useState(null);
  const v = parseAmount(value);
  const preview = v > 0 ? allotted(wallet, { mode, value: v }) : null;

  const submit = () => {
    if (!name.trim()) return setError('Give the budget a name.');
    const err = budgetError(wallet, mode, v, budget?.id);
    if (err) return setError(err);
    onSubmit({ name: name.trim(), mode, value: v, savings });
    if (!budget) { setName(''); setValue(''); setSavings(false); }
    setError(null);
  };

  return (
    <>
      <Input placeholder="Name, e.g. Groceries" value={name} onChangeText={setName} />
      <Segmented options={MODES} value={mode} onChange={setMode} />
      <Input placeholder={mode === 'percent' ? 'Percent of wallet, e.g. 25' : 'Amount, e.g. 500'}
        keyboardType="decimal-pad" value={value} onChangeText={setValue} />
      {preview != null && <Text style={s.muted}>= {money(preview)} of {money(freeFor(wallet, budget?.id))} available</Text>}
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Savings</Text>
          <Text style={s.tiny}>Set this money aside: it won't count as available to spend.</Text>
        </View>
        <Switch value={savings} onValueChange={setSavings} accessibilityLabel="Savings" />
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} />
    </>
  );
}
