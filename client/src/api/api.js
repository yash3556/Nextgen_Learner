const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export function getAuthToken() {
  return localStorage.getItem("authToken");
}

export function setAuthToken(token) {
  if (token) localStorage.setItem("authToken", token);
}

export function clearAuthToken() {
  localStorage.removeItem("authToken");
}

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(`${BASE_URL}${normalizedPath}`, {
    headers,
    ...options
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}