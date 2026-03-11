import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem("auth");
        if (stored) {
          const { user: u, token: t } = JSON.parse(stored);
          setUser(u);
          setToken(t);
        }
      } catch (e) {
        console.error("Failed to load auth", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Sign in failed");
    await AsyncStorage.setItem("auth", JSON.stringify({ user: data.user, token: data.token }));
    setUser(data.user);
    setToken(data.token);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Sign up failed");
    await AsyncStorage.setItem("auth", JSON.stringify({ user: data.user, token: data.token }));
    setUser(data.user);
    setToken(data.token);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem("auth");
    setUser(null);
    setToken(null);
  };

  const value = useMemo(() => ({ user, token, isLoading, signIn, signUp, signOut }), [user, token, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
