/** _id của MongoDB (chuỗi 24 ký tự, mock dùng chuỗi ngắn dễ đọc) */
export type Id = string;

/** Thời điểm dạng ISO 8601 (JSON không có kiểu Date) */
export type IsoDate = string;

/** Mongoose `timestamps: true` thêm hai trường này vào mọi model */
export interface Timestamps {
  createdAt: IsoDate;
  updatedAt: IsoDate;
}
