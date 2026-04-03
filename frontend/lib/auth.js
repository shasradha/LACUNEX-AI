const TOKEN_KEY = "lacunex_token";
const USER_KEY = "lacunex_user";

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
}

export function clearAuth() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}
