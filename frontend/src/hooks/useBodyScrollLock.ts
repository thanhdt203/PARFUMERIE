import { useEffect } from 'react';

// Đếm số lớp đang khóa để nhiều modal chồng nhau không mở khóa sớm
let lockCount = 0;
let previousOverflow = '';

export function useBodyScrollLock(): void {
  useEffect(() => {
    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = previousOverflow;
    };
  }, []);
}
