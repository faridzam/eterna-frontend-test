"use client";

import { ApiError } from "@/src/lib/api-client";
import { createContext, useContext, useEffect, useState } from "react";
import { authApi, type AuthenticatedUser, type LoginPayload, type RegisterPayload, type RegisterResult } from "../services/auth.api";
import { safeErrorMessage } from "./form-errors";

type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";
interface AuthContextValue {
  readonly error: string | null;
  readonly login: (payload: LoginPayload) => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly register: (payload: RegisterPayload) => Promise<RegisterResult>;
  readonly status: SessionStatus;
  readonly user: AuthenticatedUser | null;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let isCurrent = true;
    void authApi.me()
      .then((authenticatedUser) => {
        if (isCurrent) {
          setUser(authenticatedUser);
          setStatus("authenticated");
        }
      })
      .catch((requestError: unknown) => {
        if (!isCurrent) {
          return;
        }
        setUser(null);
        if (requestError instanceof ApiError && requestError.status === 401) {
          setStatus("unauthenticated");
        } else {
          setStatus("error");
          setError(safeErrorMessage(requestError));
        }
      });
    return () => { isCurrent = false; };
  }, []);

  async function login(payload: LoginPayload): Promise<void> {
    setUser(await authApi.login(payload));
    setError(null);
    setStatus("authenticated");
  }
  async function register(payload: RegisterPayload): Promise<RegisterResult> { return authApi.register(payload); }
  async function logout(): Promise<void> {
    try { await authApi.logout(); } finally { setUser(null); setError(null); setStatus("unauthenticated"); }
  }
  async function refresh(): Promise<void> {
    setStatus("loading");
    setError(null);
    try {
      setUser(await authApi.me());
      setStatus("authenticated");
    } catch (requestError: unknown) {
      setUser(null);
      if (requestError instanceof ApiError && requestError.status === 401) {
        setStatus("unauthenticated");
      } else {
        setStatus("error");
        setError(safeErrorMessage(requestError));
      }
    }
  }

  return <AuthContext value={{ error, login, logout, refresh, register, status, user }}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) { throw new Error("useAuth must be used inside AuthProvider."); }
  return context;
}