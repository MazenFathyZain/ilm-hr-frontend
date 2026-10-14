import type { TKey } from '../i18n/en'
import { currentLang, translate } from '../i18n/translate'

const ORIGIN = import.meta.env.VITE_API_URL ?? ''
const BASE = `${ORIGIN}/api/admin`

/** Absolute URL for files the API returns as relative paths (e.g. profile photos). */
export const fileUrl = (path: string | null | undefined) => (!path ? null : /^https?:\/\//.test(path) ? path : `${ORIGIN}${path}`)
const TOKEN_KEY = 'hr.token'

const tr = (key: TKey) => translate(currentLang(), key)

/**
 * Every failed API call ends up as an ApiError whose message is safe to show to the user.
 * `status` is 0 when the request never reached the server (code 'network').
 */
export class ApiError extends Error {
  status: number
  code?: string
  data?: unknown
  constructor(status: number, message: string, code?: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/** Broad category of a failure, used to pick an icon and title. */
export type ErrorKind = 'network' | 'server' | 'forbidden' | 'not_found' | 'validation' | 'generic'

export function errorKind(err: unknown): ErrorKind {
  if (err instanceof ApiError) {
    if (err.code === 'network' || err.status === 0) return 'network'
    if (err.status >= 500) return 'server'
    if (err.status === 403) return 'forbidden'
    if (err.status === 404) return 'not_found'
    if (err.status === 400 || err.status === 409 || err.status === 422) return 'validation'
    return 'generic'
  }
  if (isNetworkFailure(err)) return 'network'
  return 'generic'
}

/** User-facing text for anything thrown (ApiError, Error, geolocation errors, strings…). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (isNetworkFailure(err)) return tr('err_network')
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message ?? '')
    // Hide low-level JS/parse errors that mean nothing to a user.
    if (msg && !/unexpected token|is not valid json|json\.parse|undefined is not|cannot read prop|is not a function/i.test(msg)) return msg
  }
  return tr('err_generic')
}

function isNetworkFailure(err: unknown) {
  return err instanceof TypeError && /fetch|network|load failed/i.test(err.message)
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ } },
}

let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

type Query = Record<string, string | number | boolean | undefined | null>

function qs(query?: Query) {
  if (!query) return ''
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const token = tokenStore.get()
  return { 'Accept-Language': currentLang(), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
}

/** fetch() that turns "the request never got an answer" into a friendly ApiError. */
async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, tr('err_network'), 'network')
  }
}

interface Envelope { message?: unknown; code?: unknown; data?: unknown }

/** Reads the body as JSON without ever throwing (HTML error pages, empty bodies…). */
async function readJson(res: Response): Promise<Envelope | null> {
  const text = await res.text().catch(() => '')
  if (!text) return null
  try {
    const json = JSON.parse(text)
    return json && typeof json === 'object' ? json as Envelope : null
  } catch {
    return null
  }
}

/** Maps a non-2xx response to an ApiError with a message the user can understand. */
function toApiError(res: Response, json: Envelope | null): ApiError {
  const serverMsg = typeof json?.message === 'string' && json.message.trim() ? json.message : null
  const code = typeof json?.code === 'string' ? json.code : undefined
  const { status } = res
  if (status === 413) return new ApiError(status, tr('err_too_large'), code ?? 'too_large', json?.data)
  if (status >= 500) {
    // A JSON envelope from our API is already localized; proxies/gateways send HTML or nothing.
    if (serverMsg && code && !['internal', 'internal_error', 'server_error'].includes(code)) return new ApiError(status, serverMsg, code, json?.data)
    const key: TKey = status === 502 || status === 503 || status === 504 || !json ? 'err_unavailable' : 'err_server'
    return new ApiError(status, tr(key), code ?? 'server', json?.data)
  }
  if (serverMsg) return new ApiError(status, serverMsg, code, json?.data)
  const fallback: TKey = status === 401 ? 'err_session' : status === 403 ? 'err_forbidden' : status === 404 ? 'err_not_found' : status === 429 ? 'err_rate_limited' : 'err_generic'
  return new ApiError(status, tr(fallback), code, json?.data)
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const res = await send(`${BASE}${path}${qs(query)}`, {
    method,
    headers: headers({ 'Content-Type': 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await readJson(res)
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') onUnauthorized()
    throw toApiError(res, json)
  }
  return json?.data as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
}

/** Downloads a protected file (CSV export, uploaded document) using the bearer token. */
export async function download(path: string, query?: Query, fallbackName = 'download') {
  const res = await send(`${BASE}${path}${qs(query)}`, { headers: headers() })
  if (!res.ok) {
    if (res.status === 401) onUnauthorized()
    throw toApiError(res, await readJson(res))
  }
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: decodeURIComponent(name) })
  a.click()
  URL.revokeObjectURL(url)
}

/** Uploads one file as multipart/form-data. */
export async function uploadFile<T>(path: string, field: string, file: File): Promise<T> {
  const form = new FormData()
  form.append(field, file)
  const res = await send(`${BASE}${path}`, { method: 'POST', headers: headers(), body: form })
  const json = await readJson(res)
  if (!res.ok) {
    if (res.status === 401) onUnauthorized()
    throw toApiError(res, json)
  }
  return json?.data as T
}
