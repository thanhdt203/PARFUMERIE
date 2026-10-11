/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** 'false' = gọi API thật. Bỏ trống hoặc 'true' = dùng dữ liệu mock (mặc định). */
  readonly VITE_USE_MOCK?: 'true' | 'false';
}
