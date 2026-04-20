import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';               
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
} from 'firebase/database';
import { auth, db } from '../config/firebase';
import { User, UserRole, UserStatus } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CreateUserPayload {
  name:     string;
  email:    string;
  password: string;
  role:     UserRole;
}

export interface UpdateUserPayload {
  name?:   string;
  role?:   UserRole;
  status?: UserStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const usersRef = () => ref(db, 'users');
const userRef  = (uid: string) => ref(db, `users/${uid}`);

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Sign in and return the user's profile from the database */
export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await get(userRef(cred.user.uid));

  if (!snap.exists()) {
    throw new Error('User profile not found in database.');
  }

  return { id: cred.user.uid, ...snap.val() } as User;
};

/** Sign out the current user */
export const logoutUser = () => signOut(auth);

/**
 * Self-registration for Moviegoers.
 * Unlike createUser (which uses a secondary app to protect the admin session),
 * this registers and signs in the new user directly — which is the correct
 * behavior for public self-registration.
 */
export const registerMoviegoer = async (payload: {
  name:     string;
  email:    string;
  password: string;
}): Promise<User> => {
  // Create Firebase Auth account (signs in as this new user)
  const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);

  // Save profile to Realtime Database
  const newUser: Omit<User, 'id'> = {
    name:   payload.name,
    email:  payload.email,
    role:   'Moviegoer',
    status: 'active',
    joined: new Date().toISOString().split('T')[0],
  };

  await set(ref(db, `users/${cred.user.uid}`), newUser);

  // Sign out immediately after creating — user must log in manually
  // This prevents auto-login after registration (cleaner UX with the tab flow)
  await signOut(auth);

  return { id: cred.user.uid, ...newUser };
};

/** Get the role of the currently signed-in user */
export const getCurrentUserRole = async (
  uid: string
): Promise<UserRole | null> => {
  const snap = await get(userRef(uid));
  if (!snap.exists()) return null;
  return snap.val().role as UserRole;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a new user using a secondary Firebase app instance so the
 * currently logged-in Admin session is not interrupted.
 */
export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const secondaryApp  = initializeApp(auth.app.options, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      payload.email,
      payload.password
    );

    const newUser: Omit<User, 'id'> = {
      name:   payload.name,
      email:  payload.email,
      role:   payload.role,
      status: 'active',
      joined: new Date().toISOString().split('T')[0],
    };

    await set(userRef(cred.user.uid), newUser);

    return { id: cred.user.uid, ...newUser };
  } finally {
    await deleteApp(secondaryApp);
  }
};

/** Fetch all users from the database */
export const getAllUsers = async (): Promise<User[]> => {
  const snap = await get(usersRef());
  if (!snap.exists()) return [];

  return Object.entries(snap.val()).map(([id, data]: [string, any]) => ({
    id,
    ...data,
  }));
};

/** Fetch a single user by UID */
export const getUserById = async (uid: string): Promise<User | null> => {
  const snap = await get(userRef(uid));
  if (!snap.exists()) return null;
  return { id: uid, ...snap.val() } as User;
};

/** Update user profile fields (name, role, status) */
export const updateUser = async (
  uid: string,
  payload: UpdateUserPayload
): Promise<void> => {
  await update(userRef(uid), payload);
};

/** Soft delete — set status to inactive */
export const deactivateUser = async (uid: string): Promise<void> => {
  await update(userRef(uid), { status: 'inactive' });
};

/** Hard delete user record from database */
export const deleteUser = async (uid: string): Promise<void> => {
  await remove(userRef(uid));
};

/** Change password for the currently logged-in user */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user is currently logged in.');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

/**
 * Listen to all users in real time.
 * Returns an unsubscribe function — call it when the component unmounts.
 */
export const subscribeToUsers = (
  callback: (users: User[]) => void
): (() => void) => {
  const dbRef = usersRef();

  onValue(dbRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const users: User[] = Object.entries(snap.val()).map(
      ([id, data]: [string, any]) => ({ id, ...data })
    );
    callback(users);
  });

  return () => off(dbRef);
};