export const authMe = async (req, res) => {
    try {
        const khachHang = req.khachHang;

        return res.status(200).json({
            khachHang
        });

    } catch (error) {
        console.error('Lỗi khi gọi authMe', error);
        return res.status(500).json({message: "Lỗi hệ thống"})
    }
};