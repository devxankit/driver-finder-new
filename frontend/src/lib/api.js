/**
 * Small fetch wrapper for the Driver Finder API.
 * Errors are thrown as ApiError with the server's message, code and fieldErrors.
 */
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const TOKEN_KEY = 'df.admin.token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  constructor(message, { status, code, fieldErrors } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn)

export async function api(path, { method = 'GET', body, query, auth = true, signal } = {}) {
  const url = new URL(`${API_URL}/api${path}`, window.location.origin)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const headers = {}
  const token = auth ? tokenStore.get() : null
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = body instanceof FormData
  if (body && !isForm) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(url, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Check that the backend is running.', { status: 0, code: 'NETWORK' })
  }

  let data = {}
  try {
    data = await res.json()
  } catch {
    // empty or non-JSON body
  }
  if (!res.ok || data.success === false) {
    if (res.status === 401 && auth) onUnauthorized()
    throw new ApiError(data.message || `Request failed (${res.status})`, { status: res.status, code: data.code, fieldErrors: data.fieldErrors })
  }
  return data
}

/** Absolute URL for an /uploads path or a protected admin document. */
export function fileUrl(path, { withToken = false } = {}) {
  if (!path) return null
  if (/^https?:/.test(path)) return path
  const base = `${API_URL}${path}`
  return withToken ? `${base}?token=${encodeURIComponent(tokenStore.get() || '')}` : base
}
