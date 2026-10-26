// Pure money logic, kept separate so it can be checked with plain node.
export const allotted = (wallet, b) =>
  b.mode === 'percent' ? (wallet.amount * b.value) / 100 : b.value;

export const spent = (b) => b.expenses.reduce((s, e) => s + e.amount, 0);

export const summary = (wallet) => {
  const totalAllotted = wallet.budgets.reduce((s, b) => s + allotted(wallet, b), 0);
  const totalSpent = wallet.budgets.reduce((s, b) => s + spent(b), 0);
  return {
    totalAllotted,
    unallocated: wallet.amount - totalAllotted,
    totalSpent,
    remaining: wallet.amount - totalSpent,
  };
};

// Unallocated amount ignoring one budget, so an edited budget can reuse its own share.
export const freeFor = (wallet, exceptId) =>
  summary({ ...wallet, budgets: wallet.budgets.filter((b) => b.id !== exceptId) }).unallocated;

// Returns an error message, or null when the budget fits in the wallet.
export const budgetError = (wallet, mode, value, exceptId) => {
  if (!(value > 0)) return 'Enter a value greater than 0.';
  if (mode === 'percent' && value > 100) return 'Percentage cannot exceed 100.';
  const amount = allotted(wallet, { mode, value });
  const free = freeFor(wallet, exceptId);
  if (amount > free + 0.005) return `Only ${money(free)} left to allot.`;
  return null;
};

export const amountError = (wallet, amount) => {
  if (!(amount > 0)) return 'Enter an amount greater than 0.';
  const { totalAllotted, unallocated } = summary({ ...wallet, amount });
  if (unallocated < -0.005) return `Budgets already allot ${money(totalAllotted)}.`;
  return null;
};

// Days are local 'YYYY-MM-DD' strings, so plain string comparison orders them.
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => ymd(new Date());
// Older expenses hold a full ISO timestamp instead of a day.
export const dayOf = (date) => (date.length === 10 ? date : ymd(new Date(date)));
export const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseDay(s)) === s;
export const fmtDay = (s) => parseDay(s).toLocaleDateString();
export const inRange = (w, day) => !!w.start && w.start <= day && day <= w.end;
export const walletFor = (wallets, day) => wallets.find((w) => inRange(w, day));
// Today, or the wallet's first day when today is outside its range.
export const defaultDay = (w) => (!w?.start || inRange(w, today()) ? today() : w.start);

// Every expense with its wallet and budget, newest first.
export const expenseRows = (wallets) => wallets
  .flatMap((w) => w.budgets.flatMap((b) => b.expenses.map((e) => ({ w, b, e, day: dayOf(e.date) }))))
  .sort((p, q) => q.day.localeCompare(p.day));

// Range is optional, but must be complete, not overlap another wallet, and keep the wallet's expenses inside.
export const rangeError = (wallets, wid, start, end) => {
  if (!start && !end) return null;
  if (!isDay(start) || !isDay(end)) return 'Dates must be YYYY-MM-DD.';
  if (start > end) return 'Start date must be on or before end date.';
  const clash = wallets.find((w) => w.id !== wid && w.start && w.start <= end && start <= w.end);
  if (clash) return `Overlaps "${clash.name}" (${clash.start} to ${clash.end}).`;
  const self = wallets.find((w) => w.id === wid);
  const outside = self?.budgets.some((b) => b.expenses.some((e) => !inRange({ start, end }, dayOf(e.date))));
  if (outside) return 'Some expenses fall outside this range.';
  return null;
};

// Edit an expense, moving it to budget `to.bid` in wallet `to.wid` (they may be its current ones).
export const moveExpense = (wallets, wid, bid, eid, { wid: toW, bid: toB, ...fields }) => {
  const old = wallets.find((w) => w.id === wid)?.budgets.find((b) => b.id === bid)?.expenses.find((e) => e.id === eid);
  if (!old) return wallets;
  return wallets.map((w) => ({
    ...w,
    budgets: w.budgets.map((b) => {
      const rest = b.expenses.filter((e) => e.id !== eid);
      return { ...b, expenses: w.id === toW && b.id === toB ? [{ ...old, ...fields }, ...rest] : rest };
    }),
  }));
};

export const parseAmount = (text) => {
  const n = Number(String(text).replace(/,/g, '').trim());
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export const money = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
