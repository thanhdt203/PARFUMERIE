import type { StatusTone } from '../components/common/StatusBadge';
import type { StockStatus } from '../types/inventory';

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  hethang: 'Hết hàng',
  saphet: 'Sắp hết',
  conhang: 'Còn hàng',
};

export const STOCK_STATUS_TONE: Record<StockStatus, StatusTone> = {
  hethang: 'danger',
  saphet: 'warning',
  conhang: 'success',
};

/** Ngưỡng "sắp hết" mặc định, trùng NGUONG_MAC_DINH ở backend */
export const DEFAULT_LOW_STOCK = 5;
