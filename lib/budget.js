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

export const fmtShort = (s) => parseDay(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return ymd(d); };
// Round absorbs the DST hour.
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
export const relDay = (s, now = today()) => {
  const n = daysBetween(s, now);
  return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : fmtShort(s);
};
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// Burn-rate forecast of `total` money over wallet w's date range, from expenses `es`, as of `day` (today counts as elapsed).
// points: one cumulative value per day of the range, actual up to `day`, then projected at the average daily rate.
export const forecast = (w, es, total, day = today()) => {
  if (!w.start) return null;
  const length = daysBetween(w.start, w.end) + 1;
  const elapsed = Math.min(Math.max(daysBetween(w.start, day) + 1, 0), length);
  const byDay = {};
  let used = 0;
  for (const e of es) { const d = dayOf(e.date); byDay[d] = (byDay[d] ?? 0) + e.amount; used += e.amount; }
  const rate = elapsed ? used / elapsed : 0;
  const left = total - used;
  const lasts = left <= 0 ? 0 : rate > 0 ? Math.floor(left / rate) : Infinity;
  let run = 0;
  const points = Array.from({ length }, (_, i) => {
    const d = addDays(w.start, i);
    return i < elapsed ? { day: d, value: (run += byDay[d] ?? 0), future: false }
      : { day: d, value: used + rate * (i + 1 - elapsed), future: true };
  });
  return {
    phase: day < w.start ? 'Upcoming' : day > w.end ? 'Ended' : 'Active',
    length, elapsed, daysToEnd: length - elapsed, used, left, rate, lasts,
    runOut: Number.isFinite(lasts) ? addDays(day, lasts) : null,
    projected: used + rate * (length - elapsed),
    points,
  };
};

export const timeline = (w, f) =>
  f.phase === 'Upcoming' ? `Starts ${fmtShort(w.start)}`
    : f.phase === 'Ended' ? `Ended ${fmtShort(w.end)}`
      : `Day ${f.elapsed} of ${f.length} · ${plural(f.daysToEnd, 'day')} to go`;

export const lastsLabel = (f) =>
  f.left <= 0 ? 'Used up' : f.rate > 0 ? `lasts ~${plural(f.lasts, 'day')}` : 'no spending yet';

export const walletExpenses = (w) => w.budgets.flatMap((b) => b.expenses);

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

// Pie slices: spending per category (budgets grouped by name across wallets) plus what's left unspent, largest first.
// Categories past `max` fold into "Other" so slice colors never cycle.
export const categoryShares = (wallets, max = 7) => {
  const by = {};
  for (const w of wallets) for (const b of w.budgets) by[b.name] = (by[b.name] ?? 0) + spent(b);
  const cats = Object.entries(by).map(([name, value]) => ({ name, value })).filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const kept = cats.length > max ? cats.slice(0, max - 1) : cats;
  const rest = cats.slice(kept.length).reduce((t, c) => t + c.value, 0);
  if (rest > 0) kept.push({ name: 'Other', value: rest });
  // Overspent wallets add no unspent money rather than cancelling other wallets' leftovers.
  const unspent = wallets.reduce((t, w) => t + Math.max(0, summary(w).remaining), 0);
  return unspent > 0 ? [...kept, { name: 'Unspent', value: unspent, unspent: true }] : kept;
};
