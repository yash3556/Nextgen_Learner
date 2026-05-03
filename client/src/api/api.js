const BASE_URL = import.meta.env.VITE_API_URL;

const API = `${BASE_URL}/api`;

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

  const res = await fetch(`${API}${path}`, {
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