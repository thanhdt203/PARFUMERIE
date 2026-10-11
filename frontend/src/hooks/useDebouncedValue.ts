import { useEffect, useState } from 'react';

/** Trả về `value` sau khi nó đứng yên `delay` ms (dùng cho ô tìm kiếm, tránh gọi API mỗi phím gõ) */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}