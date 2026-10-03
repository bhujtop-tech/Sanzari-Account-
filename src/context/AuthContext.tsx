import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { AppUser, UserPermissions } from '../types';
import { subscribeAppUsers } from '../services/db';

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canAddSale: true,
  canAddPurchase: true,
  canAddExpense: true,
  canViewCostPrice: true,
  canViewWalletBalances: true,
  canViewReports: true,
  canManageUsers: true,
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  canAddSale: true,
  canAddPurchase: true,
  canAddExpense: false,
  canViewCostPrice: false, // "kitne me aata hai" hidden for staff by default
  canViewWalletBalances: false, // total wallet balances hidden for staff
  canViewReports: false,
  canManageUsers: false,
};

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  isUnlocked: boolean;
  currentUserProfile: { name: string; role: string; email: string };
  userPermissions: UserPermissions;
  allRegisteredUsers: AppUser[];
  switchUserAccount: (targetUser: AppUser) => void;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  loginWithPin: (pin: string) => boolean;
  lockApp: () => void;
  logout: () => Promise<void>;
  demoLogin: () => void;
}

const SAHIL_ADMIN_USER: AppUser = {
  uid: 'admin-sahil-sanzari',
  email: 'sahil@sanzari.com',
  name: 'Sahil (Main Admin)',
  role: 'Admin',
  permissions: DEFAULT_ADMIN_PERMISSIONS,
};

const SAHIL_FIREBASE_USER: User = {
  uid: 'admin-sahil-sanzari',
  displayName: 'Sahil (Main Admin)',
  email: 'sahil@sanzari.com',
  emailVerified: true,
} as unknown as User;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const active = localStorage.getItem('sanzari_active_user');
    if (active) {
      try {
        const parsed = JSON.parse(active);
        return { uid: parsed.uid, email: parsed.email, displayName: parsed.name } as unknown as User;
      } catch {
        // fallback
      }
    }
    const unlocked = localStorage.getItem('sanzari_sahil_pin_unlocked') === 'true';
    return unlocked ? SAHIL_FIREBASE_USER : null;
  });

  const [appUser, setAppUser] = useState<AppUser | null>(() => {
    const active = localStorage.getItem('sanzari_active_user');
    if (active) {
      try {
        return JSON.parse(active) as AppUser;
      } catch {
        // fallback
      }
    }
    const unlocked = localStorage.getItem('sanzari_sahil_pin_unlocked') === 'true';
    return unlocked ? SAHIL_ADMIN_USER : null;
  });

  const [allRegisteredUsers, setAllRegisteredUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('sanzari_sahil_pin_unlocked') === 'true' || !!localStorage.getItem('sanzari_active_user');
  });

  // Subscribe to appUsers to sync permissions in real-time
  useEffect(() => {
    const unsub = subscribeAppUsers((users) => {
      setAllRegisteredUsers(users);
      if (appUser) {
        const found = users.find(
          (u) => u.email.toLowerCase() === appUser.email.toLowerCase() || u.uid === appUser.uid
        );
        if (found) {
          setAppUser(found);
          localStorage.setItem('sanzari_active_user', JSON.stringify(found));
        }
      }
    });

    return () => unsub();
  }, [appUser?.email]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Find matching app user
        const matched = allRegisteredUsers.find(
          (u) => u.email.toLowerCase() === (currentUser.email || '').toLowerCase()
        );
        if (matched) {
          setAppUser(matched);
          localStorage.setItem('sanzari_active_user', JSON.stringify(matched));
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [allRegisteredUsers]);

  const switchUserAccount = (targetUser: AppUser) => {
    setAppUser(targetUser);
    const fbUser = {
      uid: targetUser.uid,
      email: targetUser.email,
      displayName: targetUser.name,
    } as unknown as User;
    setUser(fbUser);
    setIsUnlocked(true);
    localStorage.setItem('sanzari_sahil_pin_unlocked', 'true');
    localStorage.setItem('sanzari_active_user', JSON.stringify(targetUser));
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    try {
      // First check if matching user exists in Firestore appUsers or matches Main Admin
      const cleanEmail = email.toLowerCase().trim();

      // 1. Check if Firebase Auth succeeds
      try {
        const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        setUser(res.user);
      } catch {
        // Continue fallback check against registered appUsers
      }

      // Check registered users in Firestore
      const matchedUser = allRegisteredUsers.find((u) => u.email.toLowerCase() === cleanEmail);

      if (matchedUser) {
        setAppUser(matchedUser);
        const fbUser = {
          uid: matchedUser.uid,
          email: matchedUser.email,
          displayName: matchedUser.name,
        } as unknown as User;
        setUser(fbUser);
        setIsUnlocked(true);
        localStorage.setItem('sanzari_sahil_pin_unlocked', 'true');
        localStorage.setItem('sanzari_active_user', JSON.stringify(matchedUser));
        return true;
      }

      // 2. Default Main Admin Email & Pass Check
      if (
        (cleanEmail === 'sahil@sanzari.com' || cleanEmail === 'admin@sanzari.com') &&
        (pass === 'admin123' || pass === '6472')
      ) {
        setAppUser(SAHIL_ADMIN_USER);
        setUser(SAHIL_FIREBASE_USER);
        setIsUnlocked(true);
        localStorage.setItem('sanzari_sahil_pin_unlocked', 'true');
        localStorage.setItem('sanzari_active_user', JSON.stringify(SAHIL_ADMIN_USER));
        return true;
      }

      throw new Error('Invalid Email or Password');
    } catch (err) {
      console.error('Email Login Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPin = (pin: string): boolean => {
    if (pin.trim() === '6472') {
      setIsUnlocked(true);
      setUser(SAHIL_FIREBASE_USER);
      setAppUser(SAHIL_ADMIN_USER);
      localStorage.setItem('sanzari_sahil_pin_unlocked', 'true');
      localStorage.setItem('sanzari_active_user', JSON.stringify(SAHIL_ADMIN_USER));
      return true;
    }
    return false;
  };

  const lockApp = () => {
    setIsUnlocked(false);
    setUser(null);
    setAppUser(null);
    localStorage.removeItem('sanzari_sahil_pin_unlocked');
    localStorage.removeItem('sanzari_active_user');
  };

  const logout = async () => {
    lockApp();
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const demoLogin = () => {
    setIsUnlocked(true);
    setUser(SAHIL_FIREBASE_USER);
    setAppUser(SAHIL_ADMIN_USER);
    localStorage.setItem('sanzari_sahil_pin_unlocked', 'true');
    localStorage.setItem('sanzari_active_user', JSON.stringify(SAHIL_ADMIN_USER));
  };

  const isAdmin = appUser?.role === 'Admin' || !appUser;

  const userPermissions: UserPermissions = appUser?.permissions || (
    isAdmin ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS
  );

  const currentUserProfile = {
    name: appUser?.name || 'Sahil (Admin)',
    role: appUser?.role === 'Admin' ? 'Main Admin' : `Staff (${appUser?.role || 'Staff'})`,
    email: appUser?.email || 'sahil@sanzari.com',
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        isAdmin,
        isUnlocked,
        currentUserProfile,
        userPermissions,
        allRegisteredUsers,
        switchUserAccount,
        loginWithEmail,
        loginWithPin,
        lockApp,
        logout,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
