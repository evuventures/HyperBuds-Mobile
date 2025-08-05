// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase';
import {
  createSession,
  getSession,
  logout as apiLogout,
  registerUser,
  forgotPassword as apiForgotPassword,
  User as ApiUser,
  RegisterPayload,
} from '../api/auth';

interface AuthContextType {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for existing session
  useEffect(() => {
    getSession()
      .then(res => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // login: Firebase -> get ID token -> create backend session -> set user
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await createSession(idToken);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  // register: backend registration, then they’ll verify email, etc.
  const register = async (data: RegisterPayload) => {
    setLoading(true);
    try {
      await registerUser(data);
      // you might navigate to a “check your email” screen here
    } finally {
      setLoading(false);
    }
  };

  // forgot password
  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await apiForgotPassword(email);
    } finally {
      setLoading(false);
    }
  };

  // logout: clear backend session, Firebase sign-out, clear user
  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
      await firebaseAuth.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, forgotPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}