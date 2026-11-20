import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { BOOTSTRAPPED_ADMIN_EMAIL, SCHEMA_LIMITS, UserProfile, UserRole } from '../types/mealloop';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  loginWithGoogle: (preferredRole?: 'student' | 'provider') => Promise<UserProfile>;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  registerWithEmail: (params: {
    displayName: string;
    email: string;
    password: string;
    phone: string;
    hostelOrPg: string;
    role: 'student' | 'provider';
  }) => Promise<UserProfile>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function translateAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Browser blocked the sign-in popup. Please allow popups for this site.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method → Enable Email/Password). Google Sign-In works immediately.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const ensureUserProfile = useCallback(
    async (user: User, preferredRole: 'student' | 'provider' = 'student', extra?: { displayName?: string; phone?: string; hostelOrPg?: string }): Promise<UserProfile> => {
      const userRef = doc(db, 'users', user.uid);
      let snap;
      try {
        snap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      const isBootstrapped =
        user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified;

      if (snap.exists()) {
        const existing = snap.data() as UserProfile;
        const resolvedRole: UserRole = isBootstrapped ? 'admin' : existing.role;
        if (existing.emailVerified !== user.emailVerified || existing.role !== resolvedRole) {
          try {
            await updateDoc(userRef, {
              emailVerified: user.emailVerified,
              ...(isBootstrapped ? { role: 'admin' } : {}),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            // Non-fatal if role immutable check prevents non-admin update
            console.warn('Profile sync warning:', err);
          }
        }
        return { ...existing, emailVerified: user.emailVerified, role: resolvedRole };
      }

      const roleToAssign: UserRole = isBootstrapped ? 'admin' : preferredRole;
      const newProfile: UserProfile = {
        uid: user.uid,
        displayName: (extra?.displayName || user.displayName || user.email?.split('@')[0] || 'DBS Student').slice(0, SCHEMA_LIMITS.NAME_MAX),
        email: (user.email || '').slice(0, SCHEMA_LIMITS.EMAIL_MAX),
        phone: (extra?.phone || '').slice(0, SCHEMA_LIMITS.PHONE_MAX),
        hostelOrPg: (extra?.hostelOrPg || 'DBS Global University Campus, Dehradun').slice(0, 160),
        role: roleToAssign,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(userRef, newProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }

      return newProfile;
    },
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const prof = await ensureUserProfile(user);
          setProfile(prof);
        } catch (err) {
          console.error('Failed loading profile:', err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [ensureUserProfile]);

  const loginWithGoogle = useCallback(
    async (preferredRole: 'student' | 'provider' = 'student'): Promise<UserProfile> => {
      const cred = await signInWithPopup(auth, googleProvider);
      const prof = await ensureUserProfile(cred.user, preferredRole);
      setProfile(prof);
      return prof;
    },
    [ensureUserProfile]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<UserProfile> => {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const prof = await ensureUserProfile(cred.user);
      setProfile(prof);
      return prof;
    },
    [ensureUserProfile]
  );

  const registerWithEmail = useCallback(
    async (params: {
      displayName: string;
      email: string;
      password: string;
      phone: string;
      hostelOrPg: string;
      role: 'student' | 'provider';
    }): Promise<UserProfile> => {
      const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
      await updateProfile(cred.user, { displayName: params.displayName.trim() });
      try {
        await sendEmailVerification(cred.user);
      } catch (verErr) {
        console.warn('Verification email send warning:', verErr);
      }
      const prof = await ensureUserProfile(cred.user, params.role, {
        displayName: params.displayName,
        phone: params.phone,
        hostelOrPg: params.hostelOrPg,
      });
      setProfile(prof);
      return prof;
    },
    [ensureUserProfile]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error('No signed-in user.');
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const updatedUser = auth.currentUser;
    setFirebaseUser(updatedUser);
    if (updatedUser.emailVerified && profile) {
      const prof = await ensureUserProfile(updatedUser);
      setProfile(prof);
    }
    return updatedUser.emailVerified;
  }, [ensureUserProfile, profile]);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const prof = await ensureUserProfile(auth.currentUser);
    setProfile(prof);
  }, [ensureUserProfile]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
  }, []);

  const isAdmin =
    profile?.role === 'admin' ||
    (firebaseUser?.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL && Boolean(firebaseUser?.emailVerified));

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        isAdmin,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        requestPasswordReset,
        resendVerificationEmail,
        refreshVerificationStatus,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
