import React, {
  createContext, useContext, useState,
  useEffect, useRef, ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth }               from '../config/firebase';
import { User, UserRole }     from '../types';
import { DEFAULT_VIEWS }      from '../utils/helpers';
import {
  loginUser,
  logoutUser,
  getCurrentUserRole,
  signInWithGoogle,
  completeGoogleRedirect,
  sendPasswordReset,
  registerMoviegoer,
} from '../services/userService';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RegisterPayload {
  name:        string;
  displayName: string;
  username:    string;
  email:       string;
  password:    string;
}

interface AuthContextValue {
  isLoggedIn:  boolean;
  isLoading:   boolean;
  role:        UserRole;
  actualRole:  UserRole; // For Admins who can switch roles 
  uid:         string | null;
  currentView: string;
  error:       string | null;
  /** Room an Admin has picked while viewing as a Cinema Room Manager. */
  viewRoomId:  string | null;
  login:       (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register:    (payload: RegisterPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout:      () => Promise<void>;
  setView:     (view: string) => void;
  switchRole:  (role: UserRole) => void;
  setViewRoomId: (roomId: string | null) => void;
  clearError:  () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn:  false,
  isLoading:   true,
  role:        'Moviegoer',
  actualRole:  'Moviegoer',
  uid:         null,
  currentView: 'browse',
  error:       null,
  viewRoomId:  null,
  login:       async () => {},
  loginWithGoogle: async () => {},
  register:    async () => {},
  requestPasswordReset: async () => {},
  logout:      async () => {},
  setView:     () => {},
  switchRole:  () => {},
  setViewRoomId: () => {},
  clearError:  () => {},
});

export const useAuth = () => useContext(AuthContext);



// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [isLoading,   setIsLoading]   = useState(true);
  const [role,        setRole]        = useState<UserRole>('Moviegoer');
  const [uid,         setUid]         = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('browse');
  const [error,       setError]       = useState<string | null>(null);
  const [actualRole, setActualRole] = useState<UserRole>('Moviegoer');
  // Admin-only: which room the Cinema Room Manager views are scoped to.
  // null means "fall back to the first room available".
  const [viewRoomId,  setViewRoomId]  = useState<string | null>(null);

  // While a new user is being provisioned (Google or self-registration), the
  // profile doesn't exist yet.
  // Suppress the listener's orphan-cleanup logout during that window so the
  // provisioning writes aren't rejected (auth would otherwise be cleared).
  const provisioningRef = useRef(false);

  // Apply a resolved User to the session state.
  const applyUser = (user: User) => {
    setUid(user.id);
    setRole(user.role);
    setActualRole(user.role);
    setCurrentView(DEFAULT_VIEWS[user.role]);
    setIsLoggedIn(true);
  };

  // ── Restore session on page refresh ───────────────────────────────────────
  useEffect(() => {
    let unsubscribe = () => {};

    (async () => {
      // 1. Finish a Google sign-in that used the redirect fallback. Done before
      //    attaching the listener so a freshly provisioned profile already
      //    exists by the time the orphan-cleanup check runs.
      try {
        const redirectUser = await completeGoogleRedirect();
        if (redirectUser) applyUser(redirectUser);
      } catch (err: any) {
        setError(err?.message ?? 'Google sign-in failed. Please try again.');
      }

      // 2. Attach the session listener.
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // loginWithGoogle is mid-provisioning; it will set state itself.
          if (provisioningRef.current) return;
          try {
            const userRole = await getCurrentUserRole(firebaseUser.uid);
            if (userRole) {
              setUid(firebaseUser.uid);
              setRole(userRole);
              setActualRole(userRole);
              setCurrentView(DEFAULT_VIEWS[userRole]);
              setIsLoggedIn(true);
            } else {
              await logoutUser();
              setIsLoggedIn(false);
            }
          } catch {
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
          setUid(null);
        }
        setIsLoading(false);
      });
    })();

    return () => unsubscribe();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginUser(email, password);
      applyUser(user);
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
          ? 'Invalid email or password. Please try again.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Please try again later.'
          : err.message ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google sign-in ───────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    setError(null);
    setIsLoading(true);
    provisioningRef.current = true;
    try {
      const user = await signInWithGoogle();
      applyUser(user);
    } catch (err: any) {
      // Silently ignore user-cancelled popups.
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request'
      ) {
        const msg =
          err.code === 'auth/account-exists-with-different-credential'
            ? 'An account already exists with this email. Sign in with your password instead.'
            : err.code === 'auth/popup-blocked'
            ? 'Popup blocked by the browser. Please allow popups and try again.'
            : err.message ?? 'Google sign-in failed. Please try again.';
        setError(msg);
      }
    } finally {
      provisioningRef.current = false;
      setIsLoading(false);
    }
  };

  // ── Self-registration ──────────────────────────────────────────────────────
  // Creating the Auth account signs the new user in before their profile row
  // exists, so the listener would see a role-less user and log them straight
  // back out — cancelling the auth the profile writes still need. Hold the
  // provisioning guard until registerMoviegoer has finished writing.
  // Throws on failure; the caller owns its own loading/error UI.
  const register = async (payload: RegisterPayload) => {
    provisioningRef.current = true;
    try {
      await registerMoviegoer(payload);
    } finally {
      provisioningRef.current = false;
    }
  };

  // ── Password reset email ───────────────────────────────────────────────────
  // Throws a display-ready message; the caller owns its own loading/error UI,
  // so this deliberately leaves the shared isLoading/error state untouched.
  const requestPasswordReset = async (email: string) => {
    try {
      await sendPasswordReset(email);
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many reset requests. Please wait a while and try again.'
          : err.code === 'auth/network-request-failed'
          ? 'Network error. Check your connection and try again.'
          : err.message ?? 'Could not send the reset email. Please try again.';
      throw new Error(msg);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await logoutUser();
    setIsLoggedIn(false);
    setUid(null);
    setRole('Moviegoer');
    setCurrentView('browse');
    setViewRoomId(null);
  };

  const setView    = (view: string)      => setCurrentView(view);
  const clearError = ()                  => setError(null);
  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    setCurrentView(DEFAULT_VIEWS[newRole]);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn, isLoading, role, actualRole, uid,
        currentView, error, viewRoomId,
        login, loginWithGoogle, register, requestPasswordReset,
        logout, setView, switchRole, setViewRoomId, clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
