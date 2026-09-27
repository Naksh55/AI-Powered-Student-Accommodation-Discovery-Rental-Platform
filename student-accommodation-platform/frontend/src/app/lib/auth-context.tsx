"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  login as apiLogin,
  signup as apiSignup,
  getCurrentUser,
  type CurrentUser,
  type UserRole,
} from "./api";
import { getToken, setToken, clearToken } from "./token";

type AuthContextValue = {
  user: CurrentUser | null;
  status: "loading" | "signed-in" | "signed-out";
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    full_name: string;
    email: string;
    password: string;
    role: UserRole;
    phone_number?: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"loading" | "signed-in" | "signed-out">("loading");

  async function refreshUser() {
    if (!getToken()) {
      setUser(null);
      setStatus("signed-out");
      return;
    }
    try {
      const me = await getCurrentUser();
      setUser(me);
      setStatus("signed-in");
    } catch {
      // Token is invalid or expired — treat as signed out rather than
      // leaving the app stuck on a broken session.
      clearToken();
      setUser(null);
      setStatus("signed-out");
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function login(email: string, password: string) {
    const { access_token } = await apiLogin({ email, password });
    setToken(access_token);
    await refreshUser();
  }

  async function signup(input: {
    full_name: string;
    email: string;
    password: string;
    role: UserRole;
    phone_number?: string;
  }) {
    const { access_token } = await apiSignup(input);
    setToken(access_token);
    await refreshUser();
  }

  function logout() {
    clearToken();
    setUser(null);
    setStatus("signed-out");
  }

  return (
    <AuthContext.Provider value={{ user, status, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
