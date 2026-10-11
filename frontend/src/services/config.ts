/** VITE_USE_MOCK=false -> gọi API thật qua lib/api.ts. Mặc định dùng mock. */
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK !== 'false';

/** Giả lập độ trễ mạng để thấy trạng thái loading */
export function mockDelay(ms = 300): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
