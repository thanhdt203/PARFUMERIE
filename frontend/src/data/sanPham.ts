import type { SanPham } from '../types/catalog';

const NGAY_TAO = '2024-07-01T08:00:00.000Z';

function sp(
  _id: string,
  TenSP: string,
  MoTa: string,
  ThongTinChiTiet: string,
  XuatXu: string,
  MaDM: string,
  MaTH: string,
): SanPham {
  return {
    _id,
    TenSP,
    MoTa,
    ThongTinChiTiet,
    XuatXu,
    GioiTinh: 'unisex',
    NhomHuong: [],
    NotHuong: { Dau: [], Giua: [], Cuoi: [] },
    GiaThapNhat: 0,
    GiaCaoNhat: 0,
    DaAn: false,
    MaDM,
    MaTH,
    createdAt: NGAY_TAO,
    updatedAt: NGAY_TAO,
  };
}

export const SAN_PHAM: SanPham[] = [
  sp('sp01', 'Chanel No.5 Eau de Parfum', 'Nước hoa nữ kinh điển', 'Hương hoa nhài, hoa hồng, gỗ đàn hương', 'Pháp', 'dm06', 'th01'),
  sp('sp02', 'Bleu de Chanel Eau de Parfum', 'Nước hoa nam thanh lịch', 'Hương cam chanh, bạc hà, gỗ tuyết tùng', 'Pháp', 'dm04', 'th01'),
  sp('sp03', 'Dior Sauvage Eau de Parfum', 'Nước hoa nam mạnh mẽ', 'Hương cam bergamot, tiêu, hổ phách', 'Pháp', 'dm04', 'th02'),
  sp('sp04', "Dior J'adore Eau de Parfum", 'Nước hoa nữ rực rỡ, nữ tính', 'Hương ylang-ylang, hoa hồng, hoa nhài', 'Pháp', 'dm06', 'th02'),
  sp('sp05', 'YSL Libre Eau de Parfum', 'Nước hoa nữ tự do, cá tính', 'Hương oải hương, hoa cam, vani', 'Pháp', 'dm06', 'th03'),
  sp('sp06', 'YSL Y Eau de Parfum', 'Nước hoa nam hiện đại', 'Hương táo, gừng, gỗ tuyết tùng', 'Pháp', 'dm04', 'th03'),
  sp('sp07', 'Tom Ford Oud Wood', 'Nước hoa niche gỗ trầm sang trọng', 'Hương trầm, gỗ đàn hương, đậu tonka', 'Mỹ', 'dm08', 'th04'),
  sp('sp08', 'Tom Ford Tobacco Vanille', 'Nước hoa niche ấm, ngọt, đậm', 'Hương lá thuốc, vani, hạt cacao', 'Mỹ', 'dm08', 'th04'),
  sp('sp09', 'Creed Aventus', 'Nước hoa nam đẳng cấp, lưu hương lâu', 'Hương dứa, bạch dương, xạ hương', 'Anh', 'dm04', 'th05'),
  sp('sp10', 'Jo Malone English Pear & Freesia', 'Nước hoa tươi mát, nhẹ nhàng', 'Hương lê, hoa lan Nam Phi, hổ phách', 'Anh', 'dm08', 'th06'),
  sp('sp11', 'Versace Eros Eau de Toilette', 'Nước hoa nam trẻ trung', 'Hương bạc hà, táo xanh, vani', 'Ý', 'dm05', 'th07'),
  sp('sp12', 'Versace Bright Crystal', 'Nước hoa nữ tươi sáng', 'Hương lựu, sen, xạ hương', 'Ý', 'dm07', 'th07'),
  sp('sp13', 'Replica Jazz Club', 'Nước hoa gợi không khí quán nhạc jazz', 'Hương rum, lá thuốc, vani', 'Pháp', 'dm08', 'th08'),
  sp('sp14', 'Replica By the Fireplace', 'Nước hoa ấm áp như bên lò sưởi', 'Hương hạt dẻ, gỗ khói, vani', 'Pháp', 'dm08', 'th08'),
  sp('sp15', 'Miss Dior Eau de Parfum', 'Nước hoa nữ ngọt ngào, thanh nhã', 'Hương hoa hồng, hoa mẫu đơn, xạ hương', 'Pháp', 'dm06', 'th02'),
  sp('sp16', 'Coco Mademoiselle Eau de Parfum', 'Nước hoa nữ sang trọng, quyến rũ', 'Hương cam, hoa hồng, hoắc hương', 'Pháp', 'dm06', 'th01'),
];