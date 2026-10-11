import { create } from 'zustand';

// Zustand chỉ giữ state giao diện. State đăng nhập do AuthContext quản lý.

export type Theme = 'light' | 'dark';

const THEME_KEY = 'parfumerie-admin-theme';
const SIDEBAR_KEY = 'parfumerie-admin-sidebar-collapsed';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // trình duyệt chặn localStorage
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // bỏ qua: chỉ mất khả năng ghi nhớ lựa chọn
  }
}

// Lần đầu theo prefers-color-scheme, những lần sau theo lựa chọn đã lưu
function getInitialTheme(): Theme {
  const saved = readStorage(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UiState {
  theme: Theme;
  /** thu gọn sidebar (chỉ có tác dụng trên desktop) */
  sidebarCollapsed: boolean;
  /** drawer sidebar trên mobile/tablet */
  mobileSidebarOpen: boolean;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebarCollapsed: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: getInitialTheme(),
  sidebarCollapsed: readStorage(SIDEBAR_KEY) === 'true',
  mobileSidebarOpen: false,

  setTheme: (theme) => {
    writeStorage(THEME_KEY, theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed;
    writeStorage(SIDEBAR_KEY, String(next));
    set({ sidebarCollapsed: next });
  },
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
}));
