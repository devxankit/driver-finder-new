/**
 * Driver Finder API client.
 *
 * The server address defaults to DEFAULT_API_URL. While the backend runs on a
 * PC, its Wi-Fi IP can change, so the address can be changed inside the app
 * (long-press the logo on the phone-number screen); it is saved on the device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Live API on the VPS. For local testing, long-press the logo on the phone-number screen. */
export const DEFAULT_API_URL = 'https://grtchalakbridging.com';

// v3: ignore addresses saved by earlier builds (localhost, the old Render server).
const URL_KEY = 'driverfinder.apiUrl.v3';
const TOKEN_KEY = 'driverfinder.token';

let baseUrl = DEFAULT_API_URL;
let token: string | null = null;
let onUnauthorized: () => void = () => {};

export async function loadConnection() {
  const [u, t] = await Promise.all([AsyncStorage.getItem(URL_KEY), AsyncStorage.getItem(TOKEN_KEY)]);
  if (u) baseUrl = u;
  token = t;
  return { url: baseUrl, token };
}

export const getApiUrl = () => baseUrl;

export async function setApiUrl(url: string) {
  baseUrl = url.trim().replace(/\/+$/, '') || DEFAULT_API_URL;
  await AsyncStorage.setItem(URL_KEY, baseUrl);
}

export async function setToken(t: string | null) {
  token = t;
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export const hasToken = () => !!token;
export const getToken = () => token;

export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

/** Absolute URL for a server file path ("/uploads/..."), as an <Image> source. */
export function fileSource(path?: string | null) {
  if (!path) return undefined;
  return { uri: /^https?:/.test(path) ? path : `${baseUrl}${path}` };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Opts = { method?: string; body?: unknown; query?: Record<string, string | number | undefined | null>; timeout?: number };

// 60 s: generous for weak 2G/3G signal on the highway; uploads pass their own longer timeout.
export async function api<T = any>(path: string, { method = 'GET', body, query, timeout = 60000 }: Opts = {}): Promise<T> {
  let url = `${baseUrl}/api${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined, signal: ctrl.signal });
  } catch {
    throw new ApiError('No internet or the server is not reachable. Please try again.', 0, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // empty body
  }
  if (!res.ok || data.success === false) {
    const code = data.code as string | undefined;
    if (res.status === 401 || code === 'ACCOUNT_SUSPENDED') onUnauthorized();
    // 502/503/504 without our JSON: nginx answered while the server restarts (an update) or is down.
    const fallback = res.status >= 502 && res.status <= 504
      ? 'The server is busy or updating. Please try again in a minute.'
      : res.status === 413
        ? 'That file is too large. Please choose a smaller photo.'
        : `Something went wrong (${res.status}).`;
    throw new ApiError(data.message || fallback, res.status, code || (res.status >= 502 && res.status <= 504 ? 'SERVER_BUSY' : undefined));
  }
  return data as T;
}

/**
 * Uploads a local file (camera/gallery URI) as multipart field "file".
 * Retries once on a network error: right after the camera closes, the first
 * request can hit a stale connection (seen on device), and weak mobile data drops too.
 */
export async function upload<T = any>(path: string, file: { uri: string; type?: string; name?: string }): Promise<T> {
  const send = () => {
    const fd = new FormData();
    fd.append('file', { uri: file.uri, type: file.type || 'image/jpeg', name: file.name || 'photo.jpg' } as any);
    return api<T>(path, { method: 'POST', body: fd, timeout: 60000 });
  };
  try {
    return await send();
  } catch (e) {
    if ((e as ApiError).code !== 'NETWORK') throw e;
    await new Promise<void>((r) => setTimeout(r, 800));
    return send();
  }
}

/** Quick reachability check for the server-address screen. */
export async function ping(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(`${url.replace(/\/+$/, '')}/api/health`, { signal: ctrl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
