// Run: node lib/budget.check.mjs
import assert from 'node:assert';
import { allotted, summary, budgetError, amountError, rangeError, walletFor, isDay, dayOf, moveExpense, expenseRows, parseAmount,
  forecast, walletExpenses, daysBetween, relDay, categoryShares } from './budget.js';

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
assert.deepEqual(summary(w), { totalAllotted: 700, unallocated: 300, totalSpent: 150, remaining: 850 });
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
console.log('budget checks passed');
