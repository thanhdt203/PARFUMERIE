// Danh sách Tỉnh/Thành và Phường/Xã từ API công cộng provinces.open-api.vn (bản v2).
// Từ 01/07/2025 địa chỉ hành chính chỉ còn 2 cấp: Tỉnh/Thành -> Phường/Xã (không còn Quận/Huyện).
// API công cộng có thể chậm hoặc ngừng, nên trang thanh toán có chế độ tự gõ khi tải lỗi.
const BASE = 'https://provinces.open-api.vn/api/v2';
const TIMEOUT_MS = 8000;

export interface LocationItem {
  code: number;
  name: string;
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Không tải được địa danh (${res.status})`);
  return res.json();
}

function toItems(raw: unknown): LocationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is { code: number; name: string } =>
        typeof x?.code === 'number' && typeof x?.name === 'string' && x.name !== '',
    )
    .map((x) => ({ code: x.code, name: x.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
}

// Cache theo phiên: mỗi tỉnh chỉ tải một lần (lỗi thì bỏ cache để lần sau thử lại)
let provincesCache: Promise<LocationItem[]> | null = null;
const wardsCache = new Map<number, Promise<LocationItem[]>>();

export const locationService = {
  getProvinces(): Promise<LocationItem[]> {
    if (!provincesCache) {
      provincesCache = getJson('/p/').then(toItems);
      provincesCache.catch(() => {
        provincesCache = null;
      });
    }
    return provincesCache;
  },

  getWards(provinceCode: number): Promise<LocationItem[]> {
    let cached = wardsCache.get(provinceCode);
    if (!cached) {
      cached = getJson(`/p/${provinceCode}?depth=2`).then((data) =>
        toItems((data as { wards?: unknown } | null)?.wards),
      );
      const request = cached;
      request.catch(() => {
        if (wardsCache.get(provinceCode) === request) wardsCache.delete(provinceCode);
      });
      wardsCache.set(provinceCode, cached);
    }
    return cached;
  },
};
