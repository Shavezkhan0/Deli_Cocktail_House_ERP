import {
  clearStoredAuth,
  getStoredAuth,
  saveStoredAuth,
  type EmployeeUser,
} from "./session";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiFetchOptions = {
  token?: string | null;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

type RefreshResponse = {
  token: string;
  employee: EmployeeUser;
};

type RefreshResult = "refreshed" | "expired" | "unreachable";

async function refreshAccessToken(): Promise<RefreshResult> {
  const stored = getStoredAuth();
  if (!stored?.token) {
    return "expired";
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/employee/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stored.token}`,
      },
    });

    if (!res.ok) {
      return "expired";
    }

    const data = (await res.json()) as RefreshResponse;
    saveStoredAuth(data.token, data.employee);
    return "refreshed";
  } catch {
    return "unreachable";
  }
}

function doFetch(
  path: string,
  method: string,
  token: string | null | undefined,
  body: unknown,
): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, method = "GET", body } = options;

  const activeToken = token ?? getStoredAuth()?.token;

  let res = await doFetch(path, method, activeToken, body);

  if (res.status === 401 && activeToken) {
    const result = await refreshAccessToken();

    if (result === "refreshed") {
      res = await doFetch(path, method, getStoredAuth()?.token, body);
    } else if (result === "expired") {
      clearStoredAuth();
      throw new Error("Session expired. Please sign in again.");
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Response body was not JSON; fall back to the generic message.
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
