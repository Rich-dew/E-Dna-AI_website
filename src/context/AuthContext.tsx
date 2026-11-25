import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { DEMO_USERS } from '../lib/seedData';
import {
  getFriendlyAuthError,
  isLoginLocked,
  recordFailedLogin,
  type LoginLockoutState,
  type RegisterFormValues,
} from '../lib/validation';
import type { ResearcherProfession, UserProfile } from '../types/edna';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isLiveFirebase: boolean;
  hasAdminClaim: boolean;
  adminStep2Token: string | null;
  setAdminStep2Token: (token: string | null) => void;
  lockoutState: LoginLockoutState;
  register: (form: RegisterFormValues) => Promise<void>;
  login: (email: string, password: string, rememberMe: boolean) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  loginDemoResearcher: () => Promise<UserProfile>;
  loginAdminCredentials: (email: string, password: string) => Promise<{ hasClaim: boolean; hasFirestoreRole: boolean }>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  completeDemoVerification: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserProfile: (patch: { name: string; institution: string; profession: ResearcherProfession; country: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCKOUT_KEY = 'taxatrace_login_lockout';
const LOCAL_SESSION_KEY = 'taxatrace_local_session_user';
const LOCAL_USERS_KEY = 'taxatrace_local_users_v1';

interface LocalStoredUser extends UserProfile {
  passwordHash: string;
  adminClaim?: boolean;
}

function simpleLocalDigest(input: string): string {
  // Used strictly for non-production interactive local workspace preview when Firebase env vars are absent
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `local_${(h >>> 0).toString(16)}`;
}

function loadLocalUsers(): LocalStoredUser[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const seeded: LocalStoredUser[] = DEMO_USERS.map((u) => ({
    ...u,
    passwordHash: simpleLocalDigest(u.role === 'admin' ? 'AdminTrace#2026' : 'Researcher#2026'),
    adminClaim: u.role === 'admin',
  }));
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveLocalUsers(users: LocalStoredUser[]) {
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAdminClaim, setHasAdminClaim] = useState(false);
  // Admin step-2 verification Bearer token is kept strictly in React memory (never localStorage)
  const [adminStep2Token, setAdminStep2Token] = useState<string | null>(null);

  const [lockoutState, setLockoutState] = useState<LoginLockoutState>(() => {
    try {
      const raw = window.localStorage.getItem(LOCKOUT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return { failedAttempts: 0, lockedUntil: null };
  });

  const persistLockout = useCallback((next: LoginLockoutState) => {
    setLockoutState(next);
    window.localStorage.setItem(LOCKOUT_KEY, JSON.stringify(next));
  }, []);

  const resetLockout = useCallback(() => {
    persistLockout({ failedAttempts: 0, lockedUntil: null });
  }, [persistLockout]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      // Local interactive workspace mode
      try {
        const stored =
          window.localStorage.getItem(LOCAL_SESSION_KEY) ||
          window.sessionStorage.getItem(LOCAL_SESSION_KEY);
        if (stored) {
          const parsed: UserProfile = JSON.parse(stored);
          const all = loadLocalUsers();
          const fresh = all.find((u) => u.uid === parsed.uid);
          if (fresh && !fresh.disabled) {
            setUser(fresh);
            setHasAdminClaim(Boolean(fresh.adminClaim && fresh.role === 'admin'));
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setHasAdminClaim(false);
        setAdminStep2Token(null);
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await fbUser.getIdTokenResult();
        const claimIsAdmin = tokenResult.claims?.admin === true;

        const profileRef = doc(db!, 'users', fbUser.uid);
        const snap = await getDoc(profileRef);
        let profile: UserProfile;

        if (snap.exists()) {
          const data = snap.data();
          profile = {
            uid: fbUser.uid,
            name: String(data.name || fbUser.displayName || 'Researcher'),
            email: String(data.email || fbUser.email || ''),
            institution: String(data.institution || ''),
            profession: (data.profession as ResearcherProfession) || 'Researcher',
            role: data.role === 'admin' ? 'admin' : 'user',
            country: String(data.country || ''),
            createdAt: String(data.createdAt || new Date().toISOString()),
            disabled: Boolean(data.disabled),
            emailVerified: fbUser.emailVerified,
          };
        } else {
          // Always force role: 'user' on auto-provisioned Firestore user doc
          profile = {
            uid: fbUser.uid,
            name: fbUser.displayName || 'Researcher',
            email: fbUser.email || '',
            institution: '',
            profession: 'Researcher',
            role: 'user',
            country: '',
            createdAt: new Date().toISOString(),
            disabled: false,
            emailVerified: fbUser.emailVerified,
          };
          await setDoc(profileRef, {
            name: profile.name,
            email: profile.email,
            institution: profile.institution,
            profession: profile.profession,
            role: 'user',
            country: profile.country,
            createdAt: profile.createdAt,
            disabled: false,
          });
        }

        if (profile.disabled) {
          await signOut(auth!);
          setUser(null);
          setHasAdminClaim(false);
        } else {
          setUser(profile);
          setHasAdminClaim(claimIsAdmin && profile.role === 'admin');
        }
      } catch (err) {
        console.error('Error hydrating Firebase user profile:', err);
        setUser(null);
        setHasAdminClaim(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const register = useCallback(async (form: RegisterFormValues) => {
    if (isFirebaseConfigured && auth && db) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        await updateProfile(cred.user, { displayName: form.name.trim() });
        const createdAt = new Date().toISOString();
        // Always write role: "user" — client can never set admin
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          institution: form.institution.trim(),
          profession: form.profession || 'Researcher',
          role: 'user',
          country: form.country.trim(),
          createdAt,
          disabled: false,
        });
        await sendEmailVerification(cred.user);
        setUser({
          uid: cred.user.uid,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          institution: form.institution.trim(),
          profession: (form.profession as ResearcherProfession) || 'Researcher',
          role: 'user',
          country: form.country.trim(),
          createdAt,
          disabled: false,
          emailVerified: false,
        });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed.';
        throw new Error(getFriendlyAuthError(msg));
      }
    }

    // Local preview workspace registration (enforces email verification screen and role: "user")
    const users = loadLocalUsers();
    const emailLower = form.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailLower)) {
      throw new Error(getFriendlyAuthError('auth/email-already-in-use'));
    }

    const created: LocalStoredUser = {
      uid: `user-${Date.now()}`,
      name: form.name.trim(),
      email: emailLower,
      institution: form.institution.trim(),
      profession: (form.profession as ResearcherProfession) || 'Researcher',
      role: 'user', // Strictly hardcoded to 'user'
      country: form.country.trim(),
      createdAt: new Date().toISOString(),
      disabled: false,
      emailVerified: false,
      passwordHash: simpleLocalDigest(form.password),
      adminClaim: false,
    };

    saveLocalUsers([...users, created]);
    const { passwordHash: _p, adminClaim: _a, ...publicProfile } = created;
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicProfile));
    setUser(publicProfile);
    setHasAdminClaim(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean): Promise<UserProfile> => {
      if (isLoginLocked(lockoutState)) {
        const mins = Math.ceil(((lockoutState.lockedUntil ?? Date.now()) - Date.now()) / 60000);
        throw new Error(
          `Too many failed attempts. Sign-in is temporarily locked for ${mins} more minute(s).`,
        );
      }

      if (isFirebaseConfigured && auth && db) {
        try {
          await setPersistence(
            auth,
            rememberMe ? browserLocalPersistence : browserSessionPersistence,
          );
          const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
          const snap = await getDoc(doc(db, 'users', cred.user.uid));
          const data = snap.exists() ? snap.data() : {};
          if (data.disabled) {
            await signOut(auth);
            throw new Error(getFriendlyAuthError('auth/user-disabled'));
          }
          const tokenRes = await cred.user.getIdTokenResult();
          const profile: UserProfile = {
            uid: cred.user.uid,
            name: String(data.name || cred.user.displayName || 'Researcher'),
            email: String(data.email || cred.user.email || email),
            institution: String(data.institution || ''),
            profession: (data.profession as ResearcherProfession) || 'Researcher',
            role: data.role === 'admin' ? 'admin' : 'user',
            country: String(data.country || ''),
            createdAt: String(data.createdAt || new Date().toISOString()),
            disabled: false,
            emailVerified: cred.user.emailVerified,
          };
          resetLockout();
          setUser(profile);
          setHasAdminClaim(tokenRes.claims?.admin === true && profile.role === 'admin');
          return profile;
        } catch (err: unknown) {
          const nextLockout = recordFailedLogin(lockoutState);
          persistLockout(nextLockout);
          if (isLoginLocked(nextLockout)) {
            throw new Error(
              'Account locked for 15 minutes after 5 failed sign-in attempts. Please wait or reset your password.',
            );
          }
          const msg = err instanceof Error ? err.message : 'Login failed.';
          throw new Error(getFriendlyAuthError(msg));
        }
      }

      // Local interactive preview login
      const users = loadLocalUsers();
      const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found) {
        const nextLockout = recordFailedLogin(lockoutState);
        persistLockout(nextLockout);
        if (isLoginLocked(nextLockout)) {
          throw new Error('Account locked for 15 minutes after 5 failed sign-in attempts.');
        }
        throw new Error(getFriendlyAuthError('auth/user-not-found'));
      }
      if (found.disabled) {
        throw new Error(getFriendlyAuthError('auth/user-disabled'));
      }
      if (found.passwordHash !== simpleLocalDigest(password)) {
        const nextLockout = recordFailedLogin(lockoutState);
        persistLockout(nextLockout);
        if (isLoginLocked(nextLockout)) {
          throw new Error('Account locked for 15 minutes after 5 failed sign-in attempts.');
        }
        throw new Error(getFriendlyAuthError('auth/wrong-password'));
      }

      resetLockout();
      const { passwordHash: _p, adminClaim, ...publicProfile } = found;
      if (rememberMe) {
        window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicProfile));
        window.sessionStorage.removeItem(LOCAL_SESSION_KEY);
      } else {
        window.sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicProfile));
        window.localStorage.removeItem(LOCAL_SESSION_KEY);
      }
      setUser(publicProfile);
      setHasAdminClaim(Boolean(adminClaim && publicProfile.role === 'admin'));
      return publicProfile;
    },
    [lockoutState, persistLockout, resetLockout],
  );

  const loginWithGoogle = useCallback(async (): Promise<UserProfile> => {
    if (isFirebaseConfigured && auth && db && googleProvider) {
      try {
        const cred = await signInWithPopup(auth, googleProvider);
        const ref = doc(db, 'users', cred.user.uid);
        const snap = await getDoc(ref);
        let profile: UserProfile;
        if (snap.exists()) {
          const data = snap.data();
          if (data.disabled) {
            await signOut(auth);
            throw new Error(getFriendlyAuthError('auth/user-disabled'));
          }
          profile = {
            uid: cred.user.uid,
            name: String(data.name || cred.user.displayName || 'Researcher'),
            email: String(data.email || cred.user.email || ''),
            institution: String(data.institution || ''),
            profession: (data.profession as ResearcherProfession) || 'Researcher',
            role: data.role === 'admin' ? 'admin' : 'user',
            country: String(data.country || ''),
            createdAt: String(data.createdAt || new Date().toISOString()),
            disabled: false,
            emailVerified: cred.user.emailVerified,
          };
        } else {
          profile = {
            uid: cred.user.uid,
            name: cred.user.displayName || 'Researcher',
            email: cred.user.email || '',
            institution: 'Independent Researcher',
            profession: 'Researcher',
            role: 'user',
            country: '',
            createdAt: new Date().toISOString(),
            disabled: false,
            emailVerified: true,
          };
          await setDoc(ref, {
            name: profile.name,
            email: profile.email,
            institution: profile.institution,
            profession: profile.profession,
            role: 'user',
            country: profile.country,
            createdAt: profile.createdAt,
            disabled: false,
          });
        }
        const tokenRes = await cred.user.getIdTokenResult();
        setUser(profile);
        setHasAdminClaim(tokenRes.claims?.admin === true && profile.role === 'admin');
        return profile;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
        throw new Error(getFriendlyAuthError(msg));
      }
    }

    // Local preview Google sign-in maps to the seeded researcher account
    const users = loadLocalUsers();
    const demo = users.find((u) => u.uid === 'demo-researcher-01') || users[0];
    const { passwordHash: _p, adminClaim: _a, ...publicProfile } = demo;
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicProfile));
    setUser(publicProfile);
    setHasAdminClaim(false);
    return publicProfile;
  }, []);

  const loginDemoResearcher = useCallback(async (): Promise<UserProfile> => {
    const users = loadLocalUsers();
    const demo = users.find((u) => u.uid === 'demo-researcher-01') || users[0];
    const { passwordHash: _p, adminClaim: _a, ...publicProfile } = demo;
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicProfile));
    setUser(publicProfile);
    setHasAdminClaim(false);
    return publicProfile;
  }, []);

  const loginAdminCredentials = useCallback(
    async (email: string, password: string): Promise<{ hasClaim: boolean; hasFirestoreRole: boolean }> => {
      if (isFirebaseConfigured && auth && db) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const tokenRes = await cred.user.getIdTokenResult(true);
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        const hasClaim = tokenRes.claims?.admin === true;
        const hasFirestoreRole = snap.exists() && snap.data().role === 'admin' && !snap.data().disabled;
        setHasAdminClaim(hasClaim && hasFirestoreRole);
        if (snap.exists()) {
          const data = snap.data();
          setUser({
            uid: cred.user.uid,
            name: String(data.name || cred.user.displayName || 'Administrator'),
            email: String(data.email || cred.user.email || email),
            institution: String(data.institution || ''),
            profession: (data.profession as ResearcherProfession) || 'Bioinformatician',
            role: data.role === 'admin' ? 'admin' : 'user',
            country: String(data.country || ''),
            createdAt: String(data.createdAt || new Date().toISOString()),
            disabled: Boolean(data.disabled),
            emailVerified: cred.user.emailVerified,
          });
        }
        return { hasClaim, hasFirestoreRole };
      }

      const users = loadLocalUsers();
      const found = users.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.passwordHash === simpleLocalDigest(password),
      );
      if (!found || found.disabled) {
        throw new Error('Invalid administrator credentials.');
      }
      const hasClaim = Boolean(found.adminClaim);
      const hasFirestoreRole = found.role === 'admin';
      const { passwordHash: _p, adminClaim: _a, ...publicProfile } = found;
      window.sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicProfile));
      setUser(publicProfile);
      setHasAdminClaim(hasClaim && hasFirestoreRole);
      return { hasClaim, hasFirestoreRole };
    },
    [],
  );

  const resendVerificationEmail = useCallback(async () => {
    if (isFirebaseConfigured && auth?.currentUser) {
      await sendEmailVerification(auth.currentUser);
      return;
    }
    // Local preview: simulates dispatch cleanly
  }, []);

  const refreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (isFirebaseConfigured && auth?.currentUser) {
      await auth.currentUser.reload();
      const verified = auth.currentUser.emailVerified;
      if (verified) {
        setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
      }
      return verified;
    }
    return Boolean(user?.emailVerified);
  }, [user?.emailVerified]);

  const completeDemoVerification = useCallback(() => {
    if (isFirebaseConfigured || !user) return;
    const users = loadLocalUsers().map((u) =>
      u.uid === user.uid ? { ...u, emailVerified: true } : u,
    );
    saveLocalUsers(users);
    const updated = { ...user, emailVerified: true };
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email.trim());
    }
  }, []);

  const updateUserProfile = useCallback(
    async (patch: {
      name: string;
      institution: string;
      profession: ResearcherProfession;
      country: string;
    }) => {
      if (!user) throw new Error('Not signed in.');
      if (isFirebaseConfigured && auth?.currentUser && db) {
        await updateProfile(auth.currentUser, { displayName: patch.name.trim() });
        // Note: never send role or disabled from client — enforced by Firestore rules
        await updateDoc(doc(db, 'users', user.uid), {
          name: patch.name.trim(),
          institution: patch.institution.trim(),
          profession: patch.profession,
          country: patch.country.trim(),
        });
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
        return;
      }

      const users = loadLocalUsers().map((u) =>
        u.uid === user.uid
          ? {
              ...u,
              name: patch.name.trim(),
              institution: patch.institution.trim(),
              profession: patch.profession,
              country: patch.country.trim(),
            }
          : u,
      );
      saveLocalUsers(users);
      const updated = { ...user, ...patch };
      window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
      setUser(updated);
    },
    [user],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error('Not signed in.');
      if (isFirebaseConfigured && auth?.currentUser && auth.currentUser.email) {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, cred);
        await updatePassword(auth.currentUser, newPassword);
        return;
      }
      const users = loadLocalUsers();
      const target = users.find((u) => u.uid === user.uid);
      if (!target || target.passwordHash !== simpleLocalDigest(currentPassword)) {
        throw new Error('Current password is incorrect.');
      }
      saveLocalUsers(
        users.map((u) =>
          u.uid === user.uid ? { ...u, passwordHash: simpleLocalDigest(newPassword) } : u,
        ),
      );
    },
    [user],
  );

  const deleteAccount = useCallback(
    async (currentPassword?: string) => {
      if (!user) return;
      if (isFirebaseConfigured && auth?.currentUser && db) {
        if (currentPassword && auth.currentUser.email) {
          const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
          await reauthenticateWithCredential(auth.currentUser, cred);
        }
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteUser(auth.currentUser);
        setUser(null);
        setHasAdminClaim(false);
        setAdminStep2Token(null);
        return;
      }
      const remaining = loadLocalUsers().filter((u) => u.uid !== user.uid);
      saveLocalUsers(remaining);
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
      window.sessionStorage.removeItem(LOCAL_SESSION_KEY);
      setUser(null);
      setHasAdminClaim(false);
      setAdminStep2Token(null);
    },
    [user],
  );

  const logout = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    window.sessionStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setHasAdminClaim(false);
    setAdminStep2Token(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLiveFirebase: isFirebaseConfigured,
        hasAdminClaim,
        adminStep2Token,
        setAdminStep2Token,
        lockoutState,
        register,
        login,
        loginWithGoogle,
        loginDemoResearcher,
        loginAdminCredentials,
        resendVerificationEmail,
        refreshVerificationStatus,
        completeDemoVerification,
        sendPasswordReset,
        updateUserProfile,
        changePassword,
        deleteAccount,
        logout,
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
