export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthData {
  token: string;
  user: AuthUser;
}

export function getAuth(): AuthData | null {
  try {
    const raw = localStorage.getItem("mcq_admin_auth");
    if (!raw) return null;
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

export function setAuth(data: AuthData): void {
  localStorage.setItem("mcq_admin_auth", JSON.stringify(data));
}

export function clearAuth(): void {
  localStorage.removeItem("mcq_admin_auth");
}

export function isAuthenticated(): boolean {
  return getAuth() !== null;
}
