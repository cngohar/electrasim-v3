import { useEffect, useState } from 'react';
import { request } from '../client';

export function useAdminResource<T>(path: string | null, fail: (error: unknown) => void) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    request<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active) fail(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, fail]);
  return { data, loading };
}
