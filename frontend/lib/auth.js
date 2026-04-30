const TOKEN_KEY = "lacunex_token";
const USER_KEY = "lacunex_user";
const TOKEN_TS_KEY = "lacunex_token_ts";

// Refresh the JWT every 7 days to keep sessions alive for months
const TOKEN_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function hasWindow() {
  return typeof window !== "undefined";
}

export function getToken() {
  if (!hasWindow()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (!hasWindow()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(USER_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    clearAuth();
    return null;
  }
}

export function setAuth(token, user) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(TOKEN_TS_KEY, Date.now().toString());
}

export function clearAuth() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_TS_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Returns true when the stored JWT is older than TOKEN_REFRESH_INTERVAL_MS.
 * The frontend should silently call /api/auth/refresh to get a new token.
 */
export function shouldRefreshToken() {
  if (!hasWindow()) return false;
  const ts = window.localStorage.getItem(TOKEN_TS_KEY);
  if (!ts) return true; // No timestamp — definitely refresh
  return Date.now() - Number(ts) > TOKEN_REFRESH_INTERVAL_MS;
}
