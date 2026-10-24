import { useCallback, useEffect, useRef, useState } from 'react';

export interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  /** Lần tải đầu tiên (chưa có dữ liệu). */
  loading: boolean;
  /** Đang tải lại, vẫn giữ dữ liệu cũ trên màn hình. */
  refreshing: boolean;
  updatedAt: number | null;
  reload: () => void;
}

/** Tải dữ liệu theo `deps`; giữ dữ liệu cũ khi tải lại để bố cục không nhảy. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]): QueryState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setPending(true);
    fnRef.current()
      .then((d) => { if (alive) { setData(d); setError(null); setUpdatedAt(Date.now()); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (alive) setPending(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: pending && data === undefined, refreshing: pending && data !== undefined, updatedAt, reload };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
