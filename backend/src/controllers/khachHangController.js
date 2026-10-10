export const authMe = async (req, res) => {
    try {
        return res.status(200).json({ user: req.user, role: req.role });
    } catch (error) {
        console.error('Lỗi khi gọi authMe', error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};