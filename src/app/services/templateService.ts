import {
  ref, set, get, update, remove, push, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectionConfig {
  seatRows: number;   // rows of seats inside this section
  seatCols: number;   // columns of seats inside this section
  name?:    string;   // optional label e.g. "VIP", "Standard"
}

/** Key format: "r{row}c{col}" — position of section inside the template grid */
export type SectionKey = string;  // e.g. "r0c0", "r1c2"

export interface RoomTemplate {
  id:        string;
  name:      string;
  gridRows:  number;   // how many section-rows in the layout
  gridCols:  number;   // how many section-columns in the layout
  sections:  Record<SectionKey, SectionConfig>;
  createdBy: string;
  createdAt: string;
}

export interface Room {
  id:          string;
  name:        string;
  templateId:  string;
  status:      'active' | 'inactive';
  managerId?:  string;     // legacy: primary manager (kept in sync with managerIds[0])
  managerIds?: string[];   // all managers assigned to this room
}

/** All manager UIDs assigned to a room (merges legacy managerId + managerIds). */
export const roomManagerIds = (room: Room): string[] => {
  const ids = new Set<string>();
  if (room.managerId) ids.add(room.managerId);
  (room.managerIds ?? []).forEach(id => ids.add(id));
  return Array.from(ids);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const sectionKey = (row: number, col: number): SectionKey =>
  `r${row}c${col}`;

export const parseSectionKey = (key: SectionKey): { row: number; col: number } => {
  const match = key.match(/^r(\d+)c(\d+)$/);
  if (!match) return { row: 0, col: 0 };
  return { row: parseInt(match[1]), col: parseInt(match[2]) };
};

/** Total seat count for a template */
export const templateSeatCount = (template: RoomTemplate): number =>
  Object.values(template.sections).reduce(
    (sum, sec) => sum + sec.seatRows * sec.seatCols,
    0
  );

// ─── Firebase refs ────────────────────────────────────────────────────────────
const templatesRef  = () => ref(db, 'templates');
const templateRef   = (id: string) => ref(db, `templates/${id}`);
const roomsRef      = () => ref(db, 'rooms');
const roomRef       = (id: string) => ref(db, `rooms/${id}`);

// ─── Template CRUD ────────────────────────────────────────────────────────────

/** Save a new template — auto-generates push ID */
export const createTemplate = async (
  payload: Omit<RoomTemplate, 'id'>
): Promise<RoomTemplate> => {
  const newRef = push(templatesRef());
  const id     = newRef.key!;
  await set(newRef, { ...payload, id });
  return { id, ...payload };
};

/** Update an existing template */
export const saveTemplate = async (template: RoomTemplate): Promise<void> => {
  await set(templateRef(template.id), template);
};

/** Fetch all templates */
export const getAllTemplates = async (): Promise<RoomTemplate[]> => {
  const snap = await get(templatesRef());
  if (!snap.exists()) return [];
  return Object.values(snap.val()) as RoomTemplate[];
};

/** Real-time listener for templates */
export const subscribeToTemplates = (
  callback: (templates: RoomTemplate[]) => void
): (() => void) => {
  const dbRef = templatesRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as RoomTemplate[]);
  });
  return () => off(dbRef);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await remove(templateRef(id));
};

// ─── Room CRUD ────────────────────────────────────────────────────────────────

export const createRoom = async (
  payload: Omit<Room, 'id'>
): Promise<Room> => {
  const newRef = push(roomsRef());
  const id     = newRef.key!;
  await set(newRef, { ...payload, id });
  return { id, ...payload };
};

export const getAllRooms = async (): Promise<Room[]> => {
  const snap = await get(roomsRef());
  if (!snap.exists()) return [];
  return Object.values(snap.val()) as Room[];
};

export const subscribeToRooms = (
  callback: (rooms: Room[]) => void
): (() => void) => {
  const dbRef = roomsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as Room[]);
  });
  return () => off(dbRef);
};

export const updateRoom = async (
  id: string,
  payload: Partial<Room>
): Promise<void> => {
  await update(roomRef(id), payload);
};

export const deleteRoom = async (id: string): Promise<void> => {
  await remove(roomRef(id));
};

/** Replace the full set of managers for a room. Keeps legacy managerId in sync. */
export const setRoomManagers = async (
  id: string,
  managerIds: string[]
): Promise<void> => {
  await update(roomRef(id), {
    managerIds,
    managerId: managerIds[0] ?? null,
  });
};