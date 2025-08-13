import { unixNow } from "@snort/shared";
import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState<CachedObj<T> | undefined>(() =>
    loadData<T>(key),
  );

  useEffect(() => {
    const now = unixNow();
    if (
      loading === false &&
      error === undefined &&
      (data === undefined || data.cached < now - (expires ?? 120))
    ) {
      setLoading(true);
      storeObj<T>(key, loader)
        .then(setData)
        .catch((e) => {
          if (e instanceof Error) {
            setError(e);
          } else {
            setError(new Error(e.toString()));
          }
        })
        .finally(() => setLoading(false));
    }
  }, [key, loading, error, data, loader, expires]);

  return {
    data: data?.object,
    loading,
    error,
    reloadNow: () => storeObj<T>(key, loader).then(setData),
  };
}
