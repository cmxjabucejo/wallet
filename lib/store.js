import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { moveExpense, today } from './budget';

const KEY = 'wallets:v1';
const Ctx = createContext(null);
const warn = (msg) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Storage problem', msg));
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function WalletsProvider({ children }) {
  const [wallets, setWallets] = useState(null); // null = still loading
  const loaded = useRef(false); // set only after a good read, so a failed read never gets overwritten
  const warned = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { const ws = raw ? JSON.parse(raw) : []; loaded.current = true; setWallets(ws); })
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

  const mapWallet = (wid, fn) => setWallets((ws) => ws.map((w) => (w.id === wid ? fn(w) : w)));
  const mapBudget = (wid, bid, fn) =>
    mapWallet(wid, (w) => ({ ...w, budgets: w.budgets.map((b) => (b.id === bid ? fn(b) : b)) }));

  const api = {
    wallets: wallets ?? [],
    loading: wallets === null,
    addWallet: ({ name, amount, start, end }) =>
      setWallets((ws) => [...ws, { id: id(), name, amount, start, end, budgets: [] }]),
    updateWallet: (wid, patch) => mapWallet(wid, (w) => ({ ...w, ...patch })),
    removeWallet: (wid) => setWallets((ws) => ws.filter((w) => w.id !== wid)),
    updateBudget: (wid, bid, patch) => mapBudget(wid, bid, (b) => ({ ...b, ...patch })),
    addBudget: (wid, { name, mode, value }) =>
      mapWallet(wid, (w) => ({ ...w, budgets: [...w.budgets, { id: id(), name, mode, value, expenses: [] }] })),
    removeBudget: (wid, bid) =>
      mapWallet(wid, (w) => ({ ...w, budgets: w.budgets.filter((b) => b.id !== bid) })),
    addExpense: (wid, bid, note, amount, date = today()) =>
      mapBudget(wid, bid, (b) => ({
        ...b,
        expenses: [{ id: id(), note, amount, date }, ...b.expenses],
      })),
    // patch: { wid, bid, note, amount, date } — wid/bid are where the expense ends up.
    updateExpense: (wid, bid, eid, patch) => setWallets((ws) => moveExpense(ws, wid, bid, eid, patch)),
    removeExpense: (wid, bid, eid) =>
      mapBudget(wid, bid, (b) => ({ ...b, expenses: b.expenses.filter((e) => e.id !== eid) })),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useWallets = () => useContext(Ctx);
