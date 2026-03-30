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
  whatsappNumber?: string;
  profilePicture?: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, whatsappNumber: string, phoneToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phoneNumber: string, code: string) => Promise<{ phoneToken: string }>;
  updateProfile: (name: string, whatsappNumber: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfilePicture: (picture: string) => Promise<void>;
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

  const persistUser = async (u: AuthUser, t: string) => {
    await AsyncStorage.setItem("auth", JSON.stringify({ user: u, token: t }));
    setUser(u);
    setToken(t);
  };

  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Sign in failed");
    await persistUser(data.user, data.token);
  };

  const signUp = async (name: string, email: string, password: string, whatsappNumber: string, phoneToken: string) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, whatsappNumber, phoneToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Sign up failed");
    await persistUser(data.user, data.token);
  };

  const sendOtp = async (phoneNumber: string) => {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to send code");
    return { devCode: data.devCode };
  };

  const verifyOtp = async (phoneNumber: string, code: string) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Verification failed");
    return { phoneToken: data.phoneToken };
  };

  const updateProfile = async (name: string, whatsappNumber: string) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, whatsappNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update profile");
    const updated = { ...user!, ...data.user };
    await AsyncStorage.setItem("auth", JSON.stringify({ user: updated, token }));
    setUser(updated);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch(`${API_BASE}/auth/profile/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to change password");
  };

  const updateProfilePicture = async (picture: string) => {
    const res = await fetch(`${API_BASE}/auth/profile/picture`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ picture }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update picture");
    const updated = { ...user!, profilePicture: data.profilePicture };
    await AsyncStorage.setItem("auth", JSON.stringify({ user: updated, token }));
    setUser(updated);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem("auth");
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signUp, signOut, sendOtp, verifyOtp, updateProfile, changePassword, updateProfilePicture }),
    [user, token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
