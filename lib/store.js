import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { moveExpense, recurringFor, today } from './budget';
import { cleanPhotos } from './device';

const KEY = 'wallets:v1';
const Ctx = createContext(null);
const warn = (msg) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Storage problem', msg));
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function WalletsProvider({ children }) {
  const [wallets, setWallets] = useState(null); // null = still loading
  const loaded = useRef(false); // set only after a good read, so a failed read never gets overwritten
  const warned = useRef(false);
  const [undo, setUndo] = useState(null); // { label, prev }: the last delete, restorable for a few seconds

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { const ws = raw ? JSON.parse(raw) : []; loaded.current = true; setWallets(ws); cleanPhotos(ws); })
      .catch(() => {
        setWallets([]);
        warn("Couldn't load your saved wallets. Changes won't be saved until you restart the app, so your data is kept safe.");
      });
  }, []);

  useEffect(() => {
    if (!wallets || !loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(wallets)).catch(() => {
      if (!warned.current) warn("Couldn't save your changes. Free up some storage space on your device.");
      warned.current = true;
    });
  }, [wallets]);

  // Any edit ends the undo window, so undo never rolls back a later change.
  const change = (fn) => { setUndo(null); setWallets(fn); };
  const remove = (label, fn) => { setUndo({ label, prev: wallets }); setWallets(fn); };
  const mapWallets = (fn) => (ws) => ws.map(fn);
  const inWallet = (wid, fn) => mapWallets((w) => (w.id === wid ? fn(w) : w));
  const inBudget = (wid, bid, fn) => inWallet(wid, (w) => ({ ...w, budgets: w.budgets.map((b) => (b.id === bid ? fn(b) : b)) }));

  const api = {
    wallets: wallets ?? [],
    loading: wallets === null,
    undo,
    restore: () => { setWallets(undo.prev); setUndo(null); },
    dismissUndo: () => setUndo(null),
    addWallet: ({ name, amount, start, end }) =>
      change((ws) => [...ws, { id: id(), name, amount, start, end, budgets: [] }]),
    updateWallet: (wid, patch) => change(inWallet(wid, (w) => ({ ...w, ...patch }))),
    removeWallet: (w) => remove(`Deleted wallet "${w.name}"`, (ws) => ws.filter((x) => x.id !== w.id)),
    updateBudget: (wid, bid, patch) => change(inBudget(wid, bid, (b) => ({ ...b, ...patch }))),
    // A new budget starts with the previous period's recurring expenses from the budget of the same name.
    addBudget: (wid, { name, mode, value, savings }) => change((ws) => inWallet(wid, (w) => ({
      ...w,
      budgets: [...w.budgets, { id: id(), name, mode, value, savings, expenses: recurringFor(ws, w, name).map((e) => ({ id: id(), ...e })) }],
    }))(ws)),
    removeBudget: (wid, b) =>
      remove(`Deleted budget "${b.name}"`, inWallet(wid, (w) => ({ ...w, budgets: w.budgets.filter((x) => x.id !== b.id) }))),
    // fields: { note, amount, date, recurring?, photo? }
    addExpense: (wid, bid, fields) => change(inBudget(wid, bid, (b) => ({ ...b, expenses: [{ id: id(), ...fields }, ...b.expenses] }))),
    // patch: { wid, bid, ...fields } — wid/bid are where the expense ends up.
    updateExpense: (wid, bid, eid, patch) => change((ws) => moveExpense(ws, wid, bid, eid, patch)),
    removeExpense: (wid, bid, e) =>
      remove(`Deleted "${e.note}"`, inBudget(wid, bid, (b) => ({ ...b, expenses: b.expenses.filter((x) => x.id !== e.id) }))),
    // Extras: money added to (or carried out of) a wallet during its period.
    addExtra: (wid, note, amount) => change(inWallet(wid, (w) => ({ ...w, extras: [...(w.extras ?? []), { id: id(), note, amount, date: today() }] }))),
    // A rollover is a pair of extras sharing one id, so deleting either side deletes both.
    rollover: (from, to, amount) => {
      const x = id();
      change(mapWallets((w) =>
        w.id === from.id ? { ...w, extras: [...(w.extras ?? []), { id: x, note: `Carried to ${to.name}`, amount: -amount, date: from.end }] }
          : w.id === to.id ? { ...w, extras: [...(w.extras ?? []), { id: x, note: `Carried from ${from.name}`, amount, date: to.start }] }
            : w));
    },
    removeExtra: (x) => remove(`Deleted "${x.note}"`, mapWallets((w) => ({ ...w, extras: (w.extras ?? []).filter((y) => y.id !== x.id) }))),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useWallets = () => useContext(Ctx);
