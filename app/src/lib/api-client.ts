import * as SecureStore from 'expo-secure-store';

export const DEFAULT_API_URL = 'http://10.0.2.2:3000';
export const TOKEN_STORE_KEY = 'api_bearer_token';
export const API_URL_STORE_KEY = 'api_base_url';

// Cached at module level — timezone is constant for the session; URL and token
// are invalidated by their respective setters.
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
let cachedBaseUrl: string | null = null;
let cachedToken: string | null | undefined = undefined; // undefined = not yet loaded

export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl !== null) return cachedBaseUrl;
  const stored = await SecureStore.getItemAsync(API_URL_STORE_KEY);
  cachedBaseUrl = stored ?? DEFAULT_API_URL;
  return cachedBaseUrl;
}

export async function getApiToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_STORE_KEY);
  return cachedToken;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(API_URL_STORE_KEY, url);
  cachedBaseUrl = url;
}

export async function setApiToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_STORE_KEY, token);
  cachedToken = token;
}

export async function deleteApiToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
  cachedToken = null;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const [baseUrl, token] = await Promise.all([getApiBaseUrl(), getApiToken()]);

  const headers = new Headers(options.headers as HeadersInit);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Timezone', TIMEZONE);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${baseUrl}${path}`, { ...options, headers });
}
