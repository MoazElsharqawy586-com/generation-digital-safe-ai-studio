let memoryAuthToken: string | null = null;
const TOKEN_KEY = 'sdg_auth_token';

export function getStoredAuthToken(): string | null {
  if (memoryAuthToken) return memoryAuthToken;
  try {
    const ls = window.localStorage.getItem(TOKEN_KEY);
    if (ls) {
      memoryAuthToken = ls;
      return ls;
    }
  } catch {
    // Ignore storage restriction inside strict iframes
  }
  try {
    const ss = window.sessionStorage.getItem(TOKEN_KEY);
    if (ss) {
      memoryAuthToken = ss;
      return ss;
    }
  } catch {
    // Ignore storage restriction
  }
  return null;
}

export function setStoredAuthToken(token: string | null): void {
  memoryAuthToken = token;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getStoredAuthToken();
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return window.fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'include'
  });
}
