import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filters kept in the URL so a filtered list survives refresh and can be shared.
 * Returns [values, set] where set({ key: value }) clears empty values and resets page.
 */
export function useUrlState(defaults = {}) {
  const [params, setParams] = useSearchParams()
  const values = { ...defaults }
  for (const [k, v] of params.entries()) values[k] = v
  values.page = Number(values.page || 1)

  const set = useCallback(
    (patch) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (!('page' in patch)) next.delete('page')
        Object.entries(patch).forEach(([k, v]) => (v === '' || v === null || v === undefined ? next.delete(k) : next.set(k, String(v))))
        return next
      })
    },
    [setParams]
  )
  return [values, set]
}
