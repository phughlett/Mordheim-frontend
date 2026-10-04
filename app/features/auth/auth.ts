export interface AuthUser {
  id: string;
  username: string;
}

const tokenKey = "mordheim.token";

export function getToken() {
  return typeof localStorage === "undefined" ? null : localStorage.getItem(tokenKey);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
}

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
