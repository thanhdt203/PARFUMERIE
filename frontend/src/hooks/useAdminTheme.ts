import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';

// Gắn class "dark" lên <html> khi đang ở khu vực admin, gỡ ra khi rời đi
// để trang khách không bị ảnh hưởng.
export function useAdminTheme(): void {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    return () => root.classList.remove('dark');
  }, [theme]);
}
