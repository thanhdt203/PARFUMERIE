/** Chờ backend: cấu hình kho. Giai đoạn 4 cho sửa ngưỡng này ngay trong trang Kho. */
export interface CaiDatKho {
  /** Biến thể có tồn <= ngưỡng này bị coi là sắp hết hàng */
  nguongSapHet: number;
}

export const CAI_DAT_KHO: CaiDatKho = { nguongSapHet: 5 };
