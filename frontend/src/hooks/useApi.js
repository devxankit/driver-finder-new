import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { onAdminSync } from '@/lib/live'

/**
 * Loads `path` (with `query`) and reloads whenever either changes.
 * Returns { data, error, loading, reload, setData }.
 */
export function useApi(path, query, { enabled = true, live } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(Boolean(enabled && path))
  const key = JSON.stringify([path, query])
  const ctrl = useRef(null)

  const load = useCallback(() => {
    if (!enabled || !path) return
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setLoading(true)
    setError(null)
    api(path, { query, signal: c.signal })
      .then((d) => !c.signal.aborted && setData(d))
      .catch((e) => e.name !== 'AbortError' && setError(e))
      .finally(() => !c.signal.aborted && setLoading(false))
  }, [key, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
    return () => ctrl.current?.abort()
  }, [load])

  // Reload quietly when the server reports a change to this kind of data.
  const liveKey = live ? [].concat(live).join(',') : ''
  useEffect(() => {
    if (!liveKey || !enabled || !path) return
    const wanted = liveKey.split(',')
    return onAdminSync((what) => {
      if (!what.some((w) => wanted.includes(w))) return
      api(path, { query })
        .then((d) => setData(d))
        .catch(() => {})
    })
  }, [liveKey, key, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, reload: load, setData }
}

/** Wraps a mutation: tracks `busy`, shows a toast on error, returns the result or undefined. */
export function useAction(toast) {
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async (fn, success) => {
      setBusy(true)
      try {
        const r = await fn()
        if (success) toast(success)
        return r ?? true
      } catch (e) {
        toast(e.message || 'Something went wrong', 'error')
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [toast]
  )
  return [run, busy]
}
