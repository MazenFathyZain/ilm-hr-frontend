import { useCallback, useEffect, useRef, useState } from 'react'

/** Loads data on mount and whenever `deps` change; `reload` refetches. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)

  const load = useCallback(() => {
    const id = ++seq.current
    setLoading(true)
    fetcher()
      .then((d) => { if (id === seq.current) { setData(d); setError(null) } })
      .catch((e: Error) => { if (id === seq.current) setError(e.message) })
      .finally(() => { if (id === seq.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(load, [load])
  return { data, error, loading, reload: load, setData }
}
