import type { DanhMucSanPham } from '../types/catalog';

const NGAY_TAO = '2024-06-01T08:00:00.000Z';

function dm(_id: string, TenDM: string, MoTa: string, MaDanhMucCha: string | null): DanhMucSanPham {
  return { _id, TenDM, MoTa, MaDanhMucCha, createdAt: NGAY_TAO, updatedAt: NGAY_TAO };
}

export const DANH_MUC: DanhMucSanPham[] = [
  dm('dm01', 'Nước hoa nam', 'Dòng sản phẩm dành cho nam', null),
  dm('dm02', 'Nước hoa nữ', 'Dòng sản phẩm dành cho nữ', null),
  dm('dm03', 'Nước hoa unisex', 'Dòng sản phẩm dùng chung nam nữ', null),
  dm('dm04', 'Nam - Eau de Parfum', 'Nồng độ tinh dầu cao, lưu hương lâu', 'dm01'),
  dm('dm05', 'Nam - Eau de Toilette', 'Nồng độ nhẹ, hợp đi làm ban ngày', 'dm01'),
  dm('dm06', 'Nữ - Eau de Parfum', 'Nồng độ tinh dầu cao, lưu hương lâu', 'dm02'),
  dm('dm07', 'Nữ - Eau de Toilette', 'Nồng độ nhẹ, hợp đi làm ban ngày', 'dm02'),
  dm('dm08', 'Niche và sưu tầm', 'Dòng hương độc đáo, số lượng giới hạn', 'dm03'),
];
