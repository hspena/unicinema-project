import {
  ref, set, get, update, remove, push, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SnackCategory = 'Food' | 'Beverage' | 'Combo' | 'Dessert' | 'Other';

export interface Snack {
  id:          string;
  name:        string;
  category:    SnackCategory;
  price:       number;       // in RM
  stock:       number;       // current stock units
  emoji:       string;
  description: string;
  available:   boolean;      // toggle visibility to moviegoers
  createdAt:   string;
}

export type SnackPayload = Omit<Snack, 'id' | 'createdAt'>;

// ─── Firebase refs ────────────────────────────────────────────────────────────
const snacksRef = () => ref(db, 'snacks');
const snackRef  = (id: string) => ref(db, `snacks/${id}`);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createSnack = async (payload: SnackPayload): Promise<Snack> => {
  const newRef = push(snacksRef());
  const id     = newRef.key!;
  const snack: Snack = { ...payload, id, createdAt: new Date().toISOString() };
  await set(newRef, snack);
  return snack;
};

export const updateSnack = async (
  id: string, payload: Partial<SnackPayload>
): Promise<void> => {
  await update(snackRef(id), payload);
};

export const deleteSnack = async (id: string): Promise<void> => {
  await remove(snackRef(id));
};

export const restockSnack = async (id: string, addAmount: number): Promise<void> => {
  const snap = await get(snackRef(id));
  if (!snap.exists()) return;
  const current = snap.val().stock ?? 0;
  await update(snackRef(id), { stock: current + addAmount });
};

export const subscribeToSnacks = (
  callback: (snacks: Snack[]) => void
): (() => void) => {
  const dbRef = snacksRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as Snack[]);
  });
  return () => off(dbRef);
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const SNACK_CATEGORIES: SnackCategory[] = [
  'Food', 'Beverage', 'Combo', 'Dessert', 'Other',
];

export const CATEGORY_ICONS: Record<SnackCategory, string> = {
  Food:     '🍿',
  Beverage: '🥤',
  Combo:    '🎁',
  Dessert:  '🍦',
  Other:    '🛍️',
};

// ─── Seed default snacks (run once if snacks table is empty) ──────────────────

export const seedDefaultSnacks = async (): Promise<void> => {
  const snap = await get(snacksRef());
  if (snap.exists()) return;

  const defaults: SnackPayload[] = [
    { name: 'Large Popcorn',   category: 'Food',     price: 8.50,  stock: 150, emoji: '🍿', description: 'Buttered large popcorn',          available: true },
    { name: 'Regular Popcorn', category: 'Food',     price: 5.50,  stock: 200, emoji: '🍿', description: 'Buttered regular popcorn',        available: true },
    { name: 'Cola Drink',      category: 'Beverage', price: 4.50,  stock: 250, emoji: '🥤', description: 'Chilled cola, large cup',         available: true },
    { name: 'Mineral Water',   category: 'Beverage', price: 2.50,  stock: 300, emoji: '💧', description: '500ml mineral water',             available: true },
    { name: 'Nachos & Dip',    category: 'Food',     price: 7.00,  stock: 80,  emoji: '🌮', description: 'Crispy nachos with salsa dip',    available: true },
    { name: 'Hot Dog',         category: 'Food',     price: 6.00,  stock: 60,  emoji: '🌭', description: 'Classic beef hot dog',            available: true },
    { name: 'Chocolate Bar',   category: 'Dessert',  price: 3.50,  stock: 180, emoji: '🍫', description: 'Assorted chocolate bar',          available: true },
    { name: 'Popcorn Combo',   category: 'Combo',    price: 12.00, stock: 100, emoji: '🎁', description: 'Large popcorn + cola drink',      available: true },
  ];

  for (const s of defaults) await createSnack(s);
  console.log('✅ Default snacks seeded.');
};