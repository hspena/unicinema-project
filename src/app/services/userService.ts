import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { initializeApp, deleteApp }            from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  ref, set, get, update, remove, onValue, off, query, orderByChild, equalTo,
} from 'firebase/database';
import { auth, db } from '../config/firebase';
import { User, UserRole, UserStatus } from '../types';

// ─── Extended User type (add to types/index.ts too) ──────────────────────────
// User now has:
//   displayName: string  — shown publicly (e.g. "Movie Fan 99")
//   username:    string  — unique handle (e.g. "moviefan99"), lowercase

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CreateUserPayload {
  name:        string;    // full name (internal)
  displayName: string;    // public display name
  username:    string;    // unique handle, lowercase
  email:       string;
  password:    string;
  role:        UserRole;
}

export interface UpdateUserPayload {
  name?:        string;
  displayName?: string;
  username?:    string;
  role?:        UserRole;
  status?:      UserStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const usersRef      = () => ref(db, 'users');
const userRef       = (uid: string) => ref(db, `users/${uid}`);
const usernamesRef  = () => ref(db, 'usernames');  // username → uid index
const usernameRef   = (u: string) => ref(db, `usernames/${u.toLowerCase()}`);

// ─── Username uniqueness ──────────────────────────────────────────────────────

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  const snap = await get(usernameRef(username.toLowerCase()));
  return !snap.exists();
};

const claimUsername = async (username: string, uid: string): Promise<void> => {
  await set(usernameRef(username.toLowerCase()), uid);
};

const releaseUsername = async (username: string): Promise<void> => {
  await remove(usernameRef(username.toLowerCase()));
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await get(userRef(cred.user.uid));
  if (!snap.exists()) throw new Error('User profile not found in database.');
  return { id: cred.user.uid, ...snap.val() } as User;
};

export const logoutUser = () => signOut(auth);

export const getCurrentUserRole = async (uid: string): Promise<UserRole | null> => {
  const snap = await get(userRef(uid));
  if (!snap.exists()) return null;
  return snap.val().role as UserRole;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a new user via secondary Firebase app (keeps admin session alive).
 * Also claims the username in the /usernames index.
 */
export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  // 1. Check username availability
  const available = await isUsernameAvailable(payload.username);
  if (!available) throw new Error(`Username "@${payload.username}" is already taken.`);

  // 2. Create Firebase Auth via secondary app (doesn't disrupt admin session)
  const secondaryApp  = initializeApp(auth.app.options, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth, payload.email, payload.password
    );

    const newUser: Omit<User, 'id'> = {
      name:        payload.name,
      displayName: payload.displayName || payload.name,
      username:    payload.username.toLowerCase(),
      email:       payload.email,
      role:        payload.role,
      status:      'active',
      joined:      new Date().toISOString().split('T')[0],
    };

    // 3. Save profile + claim username
    await set(userRef(cred.user.uid), newUser);
    await claimUsername(payload.username, cred.user.uid);

    return { id: cred.user.uid, ...newUser };
  } finally {
    await deleteApp(secondaryApp);
  }
};

/**
 * Self-registration for Moviegoers.
 */
export const registerMoviegoer = async (payload: {
  name:        string;
  displayName: string;
  username:    string;
  email:       string;
  password:    string;
}): Promise<User> => {
  const available = await isUsernameAvailable(payload.username);
  if (!available) throw new Error(`Username "@${payload.username}" is already taken.`);

  const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);

  const newUser: Omit<User, 'id'> = {
    name:        payload.name,
    displayName: payload.displayName || payload.name,
    username:    payload.username.toLowerCase(),
    email:       payload.email,
    role:        'Moviegoer',
    status:      'active',
    joined:      new Date().toISOString().split('T')[0],
  };

  await set(userRef(cred.user.uid), newUser);
  await claimUsername(payload.username, cred.user.uid);

  // Sign out — user logs in manually after registration
  await signOut(auth);

  return { id: cred.user.uid, ...newUser };
};

export const getAllUsers = async (): Promise<User[]> => {
  const snap = await get(usersRef());
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, data]: [string, any]) => ({ id, ...data }));
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const snap = await get(userRef(uid));
  if (!snap.exists()) return null;
  return { id: uid, ...snap.val() } as User;
};

export const updateUser = async (uid: string, payload: UpdateUserPayload): Promise<void> => {
  // If username is changing, update the index
  if (payload.username) {
    const snap = await get(userRef(uid));
    if (snap.exists()) {
      const old = snap.val();
      if (old.username && old.username !== payload.username.toLowerCase()) {
        const available = await isUsernameAvailable(payload.username);
        if (!available) throw new Error(`Username "@${payload.username}" is already taken.`);
        await releaseUsername(old.username);
        await claimUsername(payload.username, uid);
      }
    }
    payload = { ...payload, username: payload.username.toLowerCase() };
  }
  await update(userRef(uid), payload);
};

export const deleteUser = async (uid: string): Promise<void> => {
  const snap = await get(userRef(uid));
  if (snap.exists() && snap.val().username) {
    await releaseUsername(snap.val().username);
  }
  await remove(userRef(uid));
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user is currently logged in.');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

export const subscribeToUsers = (
  callback: (users: User[]) => void
): (() => void) => {
  const dbRef = usersRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const users: User[] = Object.entries(snap.val()).map(
      ([id, data]: [string, any]) => ({ id, ...data })
    );
    callback(users);
  });
  return () => off(dbRef);
};