import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mockAuth } from "./mock-auth";
import type { AccountType, AuthState, LoginCredentials, User } from "./types";

interface AuthContextValue extends AuthState {
  login(credentials: LoginCredentials, accountType: AccountType): Promise<User>;
  logout(): Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
  /** Allows deterministic route rendering in tests; omit in the application. */
  initialUser?: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => ({
    user: initialUser ?? null,
    isAuthenticated: Boolean(initialUser),
    isLoading: initialUser === undefined,
  }));

  useEffect(() => {
    if (initialUser !== undefined) return;
    let active = true;
    void mockAuth.getCurrentUser().then((user) => {
      if (!active) return;
      setState({ user, isAuthenticated: user !== null, isLoading: false });
    });
    return () => { active = false; };
  }, [initialUser]);

  const login = useCallback(async (credentials: LoginCredentials, accountType: AccountType) => {
    setState((current) => ({ ...current, isLoading: true }));
    try {
      const user = await mockAuth.login(credentials, accountType);
      setState({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      setState((current) => ({ ...current, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true }));
    await mockAuth.logout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
