import mongoose from "mongoose";

const sanPhamDungTichSchema = new mongoose.Schema({
    MaSP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SanPham",
        required: true
    },
    MaDungTich: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DungTich",
        required: true
    },
    SoLuongCo: {
        type: Number,
        required: true,
        min: 0
    },
    Gia: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    timestamps: true
});

// 1 sản phẩm không có 2 dòng trùng cùng dung tích
sanPhamDungTichSchema.index({ MaSP: 1, MaDungTich: 1 }, { unique: true });

// Tính lại GiaThapNhat / GiaCaoNhat của sản phẩm từ các biến thể
sanPhamDungTichSchema.statics.capNhatKhoangGia = async function (maSP) {
    const [reNhat, datNhat] = await Promise.all([
        this.findOne({ MaSP: maSP }, "Gia").sort({ Gia: 1 }).lean(),
        this.findOne({ MaSP: maSP }, "Gia").sort({ Gia: -1 }).lean()
    ]);
    await mongoose.model("SanPham").findByIdAndUpdate(maSP, {
        GiaThapNhat: reNhat ? reNhat.Gia : 0,
        GiaCaoNhat: datNhat ? datNhat.Gia : 0
    });
};

// Tự cập nhật khoảng giá khi thêm/sửa/xóa biến thể
sanPhamDungTichSchema.post("save", async function (doc) {
    await doc.constructor.capNhatKhoangGia(doc.MaSP);
});
sanPhamDungTichSchema.post("findOneAndUpdate", async function (doc) {
    if (doc) await doc.constructor.capNhatKhoangGia(doc.MaSP);
});
sanPhamDungTichSchema.post("findOneAndDelete", async function (doc) {
    if (doc) await doc.constructor.capNhatKhoangGia(doc.MaSP);
});

const SanPhamDungTich = mongoose.model("SanPhamDungTich", sanPhamDungTichSchema);
export default SanPhamDungTich;