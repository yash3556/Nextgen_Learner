const API = import.meta.env.VITE_API_URL +"/api";

export function getAuthToken() {
  return localStorage.getItem("authToken");
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("authToken", token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem("authToken");
}

export async function apiFetch(path, options = {}) {
  let res;
  const token = getAuthToken();

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    res = await fetch(`${API}${path}`, {
      headers,
      ...options
    });
  } catch (error) {
    const err = new Error("Could not reach the server.");
    err.cause = error;
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}