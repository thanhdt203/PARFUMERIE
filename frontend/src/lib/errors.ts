import { isAxiosError } from 'axios';

// Đổi lỗi từ axios thành câu thông báo cho người dùng
export function getErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (err.response) {
      return err.response.data?.message ?? 'Có lỗi xảy ra. Thử lại sau.';
    }
    return 'Không kết nối được tới máy chủ. Kiểm tra backend đã chạy chưa.';
  }
  return 'Có lỗi xảy ra. Thử lại sau.';
}
