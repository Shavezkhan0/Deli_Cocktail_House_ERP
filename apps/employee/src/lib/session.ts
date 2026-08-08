export type EmployeeUser = {
  id: string;
  name: string;
  email: string;
  designation: string;
};

export type StoredAuth = {
  token: string;
  user: EmployeeUser;
};

export const STORAGE_KEY = "dch-employee-auth";
export const AUTH_CHANGED_EVENT = "dch-employee-auth-changed";

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.token || !parsed.user) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredAuth(token: string, user: EmployeeUser): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
