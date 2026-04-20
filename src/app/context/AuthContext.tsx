import React, {
  createContext, useContext, useState,
  useEffect, ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth }               from '../config/firebase';
import { UserRole }           from '../types';
import { DEFAULT_VIEWS }      from '../utils/helpers';
import {
  loginUser,
  logoutUser,
  getCurrentUserRole,
} from '../services/userService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  isLoggedIn:  boolean;
  isLoading:   boolean;
  role:        UserRole;
  actualRole:  UserRole; // For Admins who can switch roles 
  uid:         string | null;
  currentView: string;
  error:       string | null;
  login:       (email: string, password: string) => Promise<void>;
  logout:      () => Promise<void>;
  setView:     (view: string) => void;
  switchRole:  (role: UserRole) => void;
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
  login:       async () => {},
  logout:      async () => {},
  setView:     () => {},
  switchRole:  () => {},
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

  // ── Restore session on page refresh ───────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
    return () => unsubscribe();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginUser(email, password);
      setUid(user.id);
      setRole(user.role);
      setActualRole(user.role);
      setCurrentView(DEFAULT_VIEWS[user.role]);
      setIsLoggedIn(true);
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

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await logoutUser();
    setIsLoggedIn(false);
    setUid(null);
    setRole('Moviegoer');
    setCurrentView('browse');
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
        currentView, error,
        login, logout, setView, switchRole, clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
