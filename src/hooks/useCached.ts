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
  const raw = window.localStorage.getItem(k);
  try {
    const obj: CachedObj<T> | undefined = JSON.parse(raw || "");
    return obj;
  } catch {
    window.localStorage.removeItem(k);
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
  window.localStorage.setItem(k, JSON.stringify(obj));
  return obj;
}

export function useCached<T>(
  key: string,
  loader: () => Promise<T>,
  expires?: number,
) {
  const isDev = import.meta.env.DEV;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState<CachedObj<T> | undefined>(() =>
    isDev ? undefined : loadData<T>(key),
  );
  const [fetched, setFetched] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (loading || error !== undefined) return;

    if (isDev) {
      if (fetched) return;
    } else {
      const now = unixNow();
      if (data !== undefined && data.cached >= now - (expires ?? 120)) return;
    }

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
  }, [key, loading, error, data, fetched, isDev, expires]);

  return {
    data: data?.object,
    loading,
    error,
    reloadNow: () => storeObj<T>(key, () => loaderRef.current()).then(setData),
  };
}
