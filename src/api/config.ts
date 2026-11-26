// API configuration layer.
// Set API_MODE to 'laravel' to use the real Laravel REST backend,
// or 'local' to use the bundled localStorage development backend.
// The Laravel base URL is read from Vite env: VITE_LARAVEL_API_URL.

export type ApiMode = 'laravel' | 'local';

const ENV_URL = import.meta.env.VITE_LARAVEL_API_URL as string | undefined;

export const API_MODE: ApiMode = ENV_URL && ENV_URL.length > 0 ? 'laravel' : 'local';

export const LARAVEL_BASE_URL = ENV_URL ?? '';

export const TOKEN_KEY = 'bpack_token';
export const USER_KEY = 'bpack_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function setStoredUser(user: string | null): void {
  if (user) localStorage.setItem(USER_KEY, user);
  else localStorage.removeItem(USER_KEY);
}

export function uid(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rnd}`;
}
