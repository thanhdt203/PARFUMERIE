import { useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '../lib/errors';

interface Request<T> {
  load: () => Promise<T>;
  key: number;
}

interface Settled<T> {
  /** Lần yêu cầu mà kết quả này thuộc về */
  request: Request<T> | null;
  data: T | null;
  error: string | null;
  updatedAt: Date | null;
}

export interface AsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
  reload: () => void;
}

/**
 * Tải dữ liệu bất đồng bộ. `load` phải ổn định (bọc useCallback với các giá trị nó phụ thuộc),
 * khi `load` đổi hoặc gọi reload() thì tải lại.
 * `loading` được suy ra bằng cách so yêu cầu hiện tại với yêu cầu của kết quả đang giữ
 * (không setState đồng bộ trong effect). Dữ liệu cũ được giữ trong lúc tải lại.
 */
export function useAsyncData<T>(load: () => Promise<T>): AsyncResult<T> {
  const [reloadKey, setReloadKey] = useState(0);
  const request = useMemo<Request<T>>(() => ({ load, key: reloadKey }), [load, reloadKey]);
  const [settled, setSettled] = useState<Settled<T>>({
    request: null,
    data: null,
    error: null,
    updatedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    request
      .load()
      .then((data) => {
        if (!cancelled) setSettled({ request, data, error: null, updatedAt: new Date() });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSettled((prev) => ({ ...prev, request, error: getErrorMessage(err) }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const loading = settled.request !== request;
  return {
    data: settled.data,
    loading,
    error: loading ? null : settled.error,
    updatedAt: settled.updatedAt,
    reload,
  };
}
