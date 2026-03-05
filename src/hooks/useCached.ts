import { unixNow } from "@snort/shared";
import { useEffect, useRef, useState } from "react";

interface CachedObj<T> {
  cached: number;
  object: T;
}

function formatKey(key: string): string {
  return `useCached:${key}`;
}

function loadData<T>(key: string): CachedObj<T> | undefined {
  const k = formatKey(key);
  const raw = localStorage.getItem(k);
  try {
    const obj: CachedObj<T> | undefined = JSON.parse(raw || "");
    return obj;
  } catch {
    localStorage.removeItem(k);
  }
}

async function storeObj<T>(
  key: string,
  loader: () => Promise<T>,
): Promise<CachedObj<T> | undefined> {
  const k = formatKey(key);
  const newData = await loader();
  const obj = {
    cached: unixNow(),
    object: newData,
  } as CachedObj<T>;
  localStorage.setItem(k, JSON.stringify(obj));
  return obj;
}

export function useCached<T>(
  key: string,
  loader: () => Promise<T>,
  expires?: number,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState<CachedObj<T> | undefined>(() =>
    loadData<T>(key),
  );
  const [fetched, setFetched] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // When the key changes (e.g. locale switch), reset state to whatever is
  // cached for the new key so the stale check below works correctly.
  const prevKeyRef = useRef(key);
  useEffect(() => {
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;
    setError(undefined);
    setFetched(false);
    setData(loadData<T>(key));
  }, [key]);

  useEffect(() => {
    if (loading || error !== undefined) return;

    const now = unixNow();
    if (data !== undefined && data.cached >= now - (expires ?? 120)) return;

    setLoading(true);
    storeObj<T>(key, () => loaderRef.current())
      .then((result) => {
        setData(result);
        setFetched(true);
      })
      .catch((e) => {
        if (e instanceof Error) {
          setError(e);
        } else {
          setError(new Error(e.toString()));
        }
      })
      .finally(() => setLoading(false));
  }, [key, loading, error, data, fetched, expires]);

  return {
    data: data?.object,
    loading,
    error,
    reloadNow: () => storeObj<T>(key, () => loaderRef.current()).then(setData),
  };
}
