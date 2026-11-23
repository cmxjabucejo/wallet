// Run: node lib/budget.check.mjs
import assert from 'node:assert';
import { allotted, summary, budgetError, amountError, rangeError, walletFor, isDay, dayOf, moveExpense, expenseRows, parseAmount,
  forecast, walletExpenses, daysBetween, relDay, categoryShares, reservedIn,
  prevWallet, nextWallet, recurringFor, budgetAlert, compareCategories } from './budget.js';

const w = {
  id: 'a',
  name: 'Oct',
  amount: 1000,
  start: '2026-10-01',
  end: '2026-10-31',
  budgets: [
    { id: 'b1', mode: 'percent', value: 50, expenses: [{ amount: 120, date: '2026-10-05' }, { amount: 30, date: '2026-10-20' }] },
    { id: 'b2', mode: 'amount', value: 200, expenses: [] },
  ],
};
assert.equal(allotted(w, w.budgets[0]), 500);
assert.deepEqual(summary(w), { totalAllotted: 700, unallocated: 300, totalSpent: 150, total: 1000, reserved: 0, spendable: 1000, remaining: 850 });
// Income can be allotted; money carried out only lowers what's left.
assert.deepEqual(summary({ ...w, extras: [{ amount: 200 }, { amount: -50 }] }), { totalAllotted: 700, unallocated: 500, totalSpent: 150, total: 1150, reserved: 0, spendable: 1150, remaining: 1000 });
assert.equal(budgetError({ ...w, extras: [{ amount: 200 }] }, 'amount', 500), null);
assert.ok(budgetError({ ...w, extras: [{ amount: 200 }] }, 'amount', 501));
assert.equal(budgetError(w, 'percent', 30), null);
assert.equal(budgetError(w, 'amount', 300), null);
assert.ok(budgetError(w, 'percent', 31));
assert.ok(budgetError(w, 'amount', 301));
assert.ok(budgetError(w, 'percent', 0));
assert.equal(budgetError(w, 'percent', 80, 'b1'), null); // editing b1 frees its own 50%
assert.ok(budgetError(w, 'percent', 81, 'b1'));
assert.equal(amountError(w, 400), null); // 50% of 400 + 200 = 400
assert.ok(amountError(w, 399));

const ws = [w, { id: 'n', name: 'Nov', start: '2026-11-01', end: '2026-11-30', budgets: [] }];
assert.equal(walletFor(ws, '2026-10-31').id, 'a');
assert.equal(walletFor(ws, '2026-11-01').id, 'n');
assert.equal(walletFor(ws, '2026-12-01'), undefined);
assert.ok(rangeError(ws, 'a', '', ''));
assert.equal(rangeError(ws, 'a', '2026-10-05', '2026-10-20'), null);
assert.ok(rangeError(ws, 'a', '2026-10-06', '2026-10-31')); // expense on 10-05 left outside
assert.ok(rangeError(ws, 'a', '2026-10-01', '2026-11-01')); // overlaps Nov
assert.ok(rangeError(ws, 'a', '2026-10-31', '2026-10-01'));
assert.ok(rangeError(ws, 'a', '2026-10-01', ''));
assert.ok(isDay('2026-02-28') && !isDay('2026-02-30') && !isDay('2026-1-01'));
assert.equal(dayOf('2026-10-05'), '2026-10-05');

const ms = [{ id: 'a', budgets: [{ id: 'x', expenses: [{ id: 'e', note: 'n', amount: 5, date: '2026-10-01' }] }] },
  { id: 'b', budgets: [{ id: 'y', expenses: [] }] }];
const moved = moveExpense(ms, 'a', 'x', 'e', { wid: 'b', bid: 'y', amount: 7, date: '2026-11-02' });
assert.equal(moved[0].budgets[0].expenses.length, 0);
assert.deepEqual(moved[1].budgets[0].expenses, [{ id: 'e', note: 'n', amount: 7, date: '2026-11-02' }]);
const same = moveExpense(ms, 'a', 'x', 'e', { wid: 'a', bid: 'x', note: 'm' });
assert.equal(same[0].budgets[0].expenses[0].note, 'm');
assert.deepEqual(expenseRows([w]).map((r) => r.day), ['2026-10-20', '2026-10-05']);
assert.equal(moveExpense(ms, 'a', 'x', 'nope', { wid: 'b', bid: 'y' }), ms);

const f = forecast(w, walletExpenses(w), 1000, '2026-10-20');
assert.equal(f.phase, 'Active');
assert.equal(f.elapsed, 20);
assert.equal(f.rate, 7.5);
assert.equal(f.lasts, 113); // 850 left / 7.5 a day
assert.equal(f.runOut, '2027-02-10');
assert.equal(f.projected, 232.5);
assert.equal(f.points.length, 31);
assert.equal(f.points[4].value, 120);
assert.equal(f.points[19].value, 150);
assert.ok(f.points[20].future && !f.points[19].future);
assert.equal(f.points[30].value, 232.5);
assert.equal(forecast(w, walletExpenses(w), 100, '2026-10-20').lasts, 0); // overspent
const up = forecast(w, [], 1000, '2026-09-01');
assert.equal(up.phase, 'Upcoming');
assert.equal(up.lasts, Infinity);
assert.equal(forecast(w, [], 1000, '2026-12-01').daysToEnd, 0);
assert.equal(forecast({ budgets: [] }, [], 1), null);
assert.equal(daysBetween('2026-03-01', '2026-04-01'), 31);
assert.equal(relDay('2026-10-19', '2026-10-20'), 'Yesterday');

assert.equal(parseAmount('1,234.567'), 1234.57);
assert.ok(Number.isNaN(parseAmount('abc')));
const nw = { ...w, budgets: w.budgets.map((b) => ({ ...b, name: b.id })) };
const two = [nw, { id: 'z', amount: 100, budgets: [{ name: 'b1', mode: 'amount', value: 50, expenses: [{ amount: 150, date: '' }] }] }];
assert.deepEqual(categoryShares([nw]), [{ name: 'b1', value: 150 }, { name: 'Unspent', value: 850, unspent: true }]);
assert.deepEqual(categoryShares(two).map((c) => c.value), [300, 850]); // overspent wallet adds no unspent
const many = { amount: 10, budgets: [1, 2, 3].map((n) => ({ name: 'c' + n, expenses: [{ amount: n }] })) };
assert.deepEqual(categoryShares([many], 2).map((c) => [c.name, c.value]), [['c3', 3], ['Other', 3], ['Unspent', 4]]);

const oct = { id: 'o', start: '2026-10-01', end: '2026-10-31', budgets: [{ name: 'Rent', expenses: [
  { note: 'Rent', amount: 400, date: '2026-10-01', recurring: true }, { note: 'Fix', amount: 50, date: '2026-10-02' },
  { note: 'Gym', amount: 30, date: '2026-10-31', recurring: true }] }, { name: 'Food', expenses: [{ amount: 80, date: '2026-10-03' }] }] };
const nov = { id: 'n', start: '2026-11-01', end: '2026-11-30', budgets: [{ name: 'Food', expenses: [{ amount: 20, date: '2026-11-03' }] }, { name: 'Fun', expenses: [] }] };
const sep = { id: 's', start: '2026-09-01', end: '2026-09-30', budgets: [] };
const wsr = [nov, oct, sep];
assert.equal(prevWallet(wsr, nov).id, 'o');
assert.equal(prevWallet(wsr, sep), undefined);
assert.equal(nextWallet(wsr, sep).id, 'o');
assert.equal(nextWallet(wsr, nov), undefined);
assert.deepEqual(recurringFor(wsr, nov, 'Rent'), [
  { note: 'Rent', amount: 400, recurring: true, date: '2026-11-01' },
  { note: 'Gym', amount: 30, recurring: true, date: '2026-11-30' }]); // Oct 31 -> day 31 is past Nov 30, capped
assert.deepEqual(recurringFor(wsr, nov, 'Food'), []);
assert.deepEqual(recurringFor(wsr, sep, 'Rent'), []);
assert.equal(budgetAlert('Food', 100, 50, 70), null);
assert.ok(budgetAlert('Food', 100, 70, 80).includes('80%'));
assert.ok(budgetAlert('Food', 100, 90, 120).includes('over budget by 20.00'));
assert.ok(budgetAlert('Food', 100, 50, 120).includes('over')); // jumps straight past 100: one alert, the worse one
assert.equal(budgetAlert('Food', 100, 110, 130), null); // already over
assert.equal(budgetAlert('Food', 100, 85, 90), null); // already past 80
assert.deepEqual(compareCategories(nov, oct), [
  { name: 'Food', now: 20, before: 80 }, { name: 'Rent', now: 0, before: 480 }]);

// Savings: b2 (200) becomes savings. Its allotment is set aside; a 50 withdrawal shrinks the reserve, not what's available.
const sv = { ...w, budgets: [w.budgets[0], { ...w.budgets[1], name: 'Save', savings: true }] };
assert.equal(reservedIn(sv, sv.budgets[1]), 200);
assert.deepEqual(summary(sv), { totalAllotted: 700, unallocated: 300, totalSpent: 150, total: 1000, reserved: 200, spendable: 800, remaining: 650 });
const sv2 = { ...sv, budgets: [sv.budgets[0], { ...sv.budgets[1], expenses: [{ amount: 50 }] }] };
assert.equal(summary(sv2).remaining, 650);
assert.equal(summary(sv2).reserved, 150);
const sv3 = { ...sv, budgets: [sv.budgets[0], { ...sv.budgets[1], expenses: [{ amount: 260 }] }] }; // overdrawn savings
assert.equal(reservedIn(sv3, sv3.budgets[1]), 0);
assert.equal(summary(sv3).remaining, 590);
// Pie: savings shows what it set aside; Unspent is only the available money.
assert.deepEqual(categoryShares([{ ...sv, budgets: sv.budgets.map((b) => ({ ...b, name: b.name ?? 'Food' })) }]).map((c) => [c.name, c.value]),
  [['Unspent', 650], ['Save', 200], ['Food', 150]].sort((a, b) => (a[0] === 'Unspent') - (b[0] === 'Unspent') || b[1] - a[1]));
console.log('budget checks passed');
