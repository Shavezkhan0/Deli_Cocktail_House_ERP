"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AUTH_CHANGED_EVENT,
  clearStoredAuth,
  getStoredAuth,
  saveStoredAuth,
  type AuthUser,
} from "./session";

export type { AuthUser } from "./session";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

type AuthContextValue = AuthState & {
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState | null>(null);

  useEffect(() => {
    function sync() {
      setState(getStoredAuth() ?? { token: null, user: null });
    }
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    saveStoredAuth(token, user);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token: state?.token ?? null,
        user: state?.user ?? null,
        isLoading: state === null,
        isAuthenticated: state !== null && Boolean(state.token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
