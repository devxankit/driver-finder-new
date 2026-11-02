/**
 * Screen data loading, built to feel instant:
 *
 * - Stale-while-revalidate: a screen shows the last data it had (memory, or
 *   disk with `persist`) immediately and refreshes quietly in the background.
 * - `initial`: data the previous screen already had (e.g. the job card that was
 *   tapped), so a detail screen renders on the first frame.
 * - `live`: refetch when the server says those lists changed (socket "sync").
 * - Refetches when the screen comes back into focus, but at most every 5 s.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { onSocket } from '../api/socket';

type Entry = { data: any; at: number };
const memory = new Map<string, Entry>();
const DISK_PREFIX = 'driverfinder.q.';
const FRESH_MS = 5000;

export const clearQueryCache = () => memory.clear();

/** Put data in the cache (e.g. after a mutation) so other screens see it at once. */
export function primeQuery(path: string, query: Record<string, unknown> | undefined, data: unknown) {
  memory.set(JSON.stringify([path, query ?? {}]), { data, at: Date.now() });
}

type Opts<T> = { initial?: T | null; persist?: boolean; live?: string[] };

export function useQuery<T = any>(path: string | null, query?: Record<string, string | number | undefined | null>, opts: Opts<T> = {}) {
  const clean = query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')) : {};
  const key = JSON.stringify([path, clean]);
  const cached = path ? memory.get(key) : undefined;
  const [data, setData] = useState<T | null>(cached?.data ?? opts.initial ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!!path && !cached);
  const seq = useRef(0);
  const keyRef = useRef(key);

  const load = useCallback(
    async (force = true) => {
      if (!path) return;
      const hit = memory.get(key);
      if (!force && hit && Date.now() - hit.at < FRESH_MS) return;
      const n = ++seq.current;
      setLoading(true);
      try {
        const d = await api<T>(path, { query: clean });
        memory.set(key, { data: d, at: Date.now() });
        if (opts.persist) AsyncStorage.setItem(DISK_PREFIX + key, JSON.stringify(d)).catch(() => {});
        if (n === seq.current) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (n === seq.current) setError(e as Error);
      } finally {
        if (n === seq.current) setLoading(false);
      }
    },
    [key], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Query changed (filters): show what we have for it, then fetch.
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      const hit = memory.get(key);
      setData(hit?.data ?? null);
    }
    let cancelled = false;
    if (!memory.has(key) && opts.persist && path) {
      AsyncStorage.getItem(DISK_PREFIX + key)
        .then((raw) => {
          if (!cancelled && raw && !memory.has(key)) setData(JSON.parse(raw));
        })
        .catch(() => {});
    }
    load(false);
    return () => {
      cancelled = true;
    };
  }, [key, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      load(false);
    }, [load]),
  );

  const liveKey = (opts.live ?? []).join(',');
  useEffect(() => {
    if (!liveKey) return;
    const wanted = liveKey.split(',');
    return onSocket<{ what: string[] }>('sync', ({ what }) => {
      if (what.some((w) => wanted.includes(w))) load(true);
    });
  }, [liveKey, load]);

  return { data, error, loading, reload: () => load(true), setData };
}

/**
 * Paged list (job feed, driver search): first page cached like useQuery,
 * `loadMore` appends the next page for infinite scrolling.
 */
export function usePagedQuery<Item>(path: string, query: Record<string, string | number | undefined | null>, listKey: string, opts: { persist?: boolean; pageSize?: number } = {}) {
  const limit = opts.pageSize ?? 15;
  const first = useQuery<any>(path, { ...query, page: 1, limit }, { persist: opts.persist });
  const [more, setMore] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const qKey = JSON.stringify(query);

  useEffect(() => {
    setMore([]);
    setPage(1);
  }, [qKey]);

  const firstItems: Item[] = first.data?.[listKey] ?? [];
  const total: number | undefined = first.data?.total;
  const items = more.length ? dedupe([...firstItems, ...more]) : firstItems;
  const hasMore = total !== undefined && items.length < total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const d = await api<any>(path, { query: { ...query, page: page + 1, limit } });
      setMore((m) => [...m, ...(d[listKey] ?? [])]);
      setPage((p) => p + 1);
    } catch {
      // keep what we have; the user can scroll again
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, path, qKey, page, limit, listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => {
    setMore([]);
    setPage(1);
    return first.reload();
  }, [first]);

  return { items, total, hasMore, loadMore, loadingMore, loading: first.loading, ready: !!first.data, error: first.error, reload };
}

function dedupe<X>(list: X[]): X[] {
  const seen = new Set<string>();
  return list.filter((x: any) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}
