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

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

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
    let code: string | undefined;
    try {
      const data = (await res.json()) as { message?: string; error?: string; detail?: string };
      if (data.detail) {
        message = data.detail;
      } else if (data.message) {
        message = data.message;
      }
      code = data.error;
    } catch {
      // Response body was not JSON; fall back to the generic message.
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function downloadFile(
  path: string,
  filename: string,
  token?: string | null,
): Promise<void> {
  const activeToken = token ?? getStoredAuth()?.token;

  let res = await doFetch(path, "GET", activeToken, undefined);

  if (res.status === 401 && activeToken) {
    const refreshResult = await refreshAccessToken();
    if (refreshResult === "refreshed") {
      res = await doFetch(path, "GET", getStoredAuth()?.token, undefined);
    } else if (refreshResult === "expired") {
      clearStoredAuth();
      throw new Error("Session expired. Please sign in again.");
    }
  }

  if (!res.ok) {
    throw new ApiError(`Request failed with status ${res.status}`, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
