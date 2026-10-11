import {
  Award,
  BrainCircuit,
  ChartColumn,
  FlaskConical,
  Layers,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Users,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../context/AuthContext';

export interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** vai trò được thấy menu này (route thật vẫn do <RoleRoute> chặn trong App.tsx) */
  roles: Role[];
  /** giai đoạn sẽ làm xong trang này, dùng cho trang tạm */
  phase: number;
  /** mô tả ngắn hiện ở trang tạm */
  description: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const STAFF_ADMIN: Role[] = ['staff', 'admin'];
const ADMIN_ONLY: Role[] = ['admin'];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      {
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: STAFF_ADMIN,
        phase: 2,
        description: 'Doanh thu, đơn hàng, khách hàng và sản phẩm sắp hết hàng.',
      },
    ],
  },
  {
    label: 'Cửa hàng',
    items: [
      {
        path: '/admin/san-pham',
        label: 'Sản phẩm',
        icon: Package,
        roles: STAFF_ADMIN,
        phase: 3,
        description: 'Quản lý sản phẩm, hình ảnh, biến thể dung tích và nốt hương.',
      },
      {
        path: '/admin/danh-muc',
        label: 'Danh mục',
        icon: Layers,
        roles: STAFF_ADMIN,
        phase: 3,
        description: 'Danh mục sản phẩm, hỗ trợ danh mục cha.',
      },
      {
        path: '/admin/thuong-hieu',
        label: 'Thương hiệu',
        icon: Award,
        roles: STAFF_ADMIN,
        phase: 3,
        description: 'Quản lý thương hiệu nước hoa.',
      },
      {
        path: '/admin/dung-tich',
        label: 'Dung tích',
        icon: FlaskConical,
        roles: STAFF_ADMIN,
        phase: 3,
        description: 'Các mức dung tích: 5ml, 10ml, 50ml, 100ml...',
      },
      {
        path: '/admin/kho',
        label: 'Kho hàng',
        icon: Warehouse,
        roles: STAFF_ADMIN,
        phase: 4,
        description: 'Tồn kho theo biến thể, nhập/xuất kho và chiết dung tích.',
      },
    ],
  },
  {
    label: 'Bán hàng',
    items: [
      {
        path: '/admin/don-hang',
        label: 'Đơn hàng',
        icon: ShoppingBag,
        roles: STAFF_ADMIN,
        phase: 5,
        description: 'Tra cứu, xem chi tiết, đổi trạng thái và xuất CSV.',
      },
      {
        path: '/admin/voucher',
        label: 'Voucher',
        icon: Ticket,
        roles: STAFF_ADMIN,
        phase: 4,
        description: 'Tạo và theo dõi mã khuyến mãi.',
      },
      {
        path: '/admin/khach-hang',
        label: 'Khách hàng',
        icon: Users,
        roles: STAFF_ADMIN,
        phase: 5,
        description: 'Thông tin khách hàng và tổng chi tiêu.',
      },
      {
        path: '/admin/bao-cao',
        label: 'Báo cáo',
        icon: ChartColumn,
        roles: STAFF_ADMIN,
        phase: 6,
        description: 'Doanh thu, tồn kho và tỷ lệ chuyển đổi từ AI chatbot.',
      },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      {
        path: '/admin/nguoi-dung',
        label: 'Người dùng',
        icon: ShieldCheck,
        roles: ADMIN_ONLY,
        phase: 5,
        description: 'Danh sách nhân viên, phân quyền và khóa tài khoản.',
      },
      {
        path: '/admin/tri-thuc-ai',
        label: 'Tri thức AI',
        icon: BrainCircuit,
        roles: ADMIN_ONLY,
        phase: 6,
        description: 'Prompt base, embedding sản phẩm và thử hỏi AI.',
      },
      {
        path: '/admin/cai-dat',
        label: 'Cài đặt',
        icon: Settings,
        roles: ADMIN_ONLY,
        phase: 6,
        description: 'Hồ sơ cá nhân, mật khẩu, giao diện và thông báo.',
      },
    ],
  },
];

const ALL_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/** Menu mà vai trò này được thấy (nhóm rỗng bị bỏ) */
export function getNavGroupsForRole(role: Role | null): AdminNavGroup[] {
  if (!role) return [];
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

/** Tìm mục menu theo đường dẫn hiện tại (khớp cả đường dẫn con như /admin/san-pham/123) */
export function findNavItem(pathname: string): AdminNavItem | undefined {
  return ALL_ITEMS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
}