// Gửi email qua SMTP (nodemailer). Cấu hình bằng biến môi trường:
//   SMTP_HOST, SMTP_PORT (mặc định 587), SMTP_USER, SMTP_PASS, MAIL_FROM
// Chưa cấu hình SMTP_HOST:
//   - môi trường dev: chỉ in nội dung ra log của backend (KHÔNG in mật khẩu ra khi production)
//   - production: ném lỗi EMAIL_NOT_CONFIGURED để API báo rõ cho admin

export class MailNotConfiguredError extends Error {
    constructor() {
        super("Chưa cấu hình SMTP để gửi email");
        this.code = "EMAIL_NOT_CONFIGURED";
    }
}

let transporterPromise = null;

const getTransporter = async () => {
    if (!process.env.SMTP_HOST) return null;
    if (!transporterPromise) {
        transporterPromise = import("nodemailer").then(({ default: nodemailer }) =>
            nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: process.env.SMTP_USER
                    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                    : undefined
            })
        );
    }
    return transporterPromise;
};

export const sendMail = async ({ to, subject, text }) => {
    const transporter = await getTransporter();

    if (!transporter) {
        if (process.env.NODE_ENV === "production") throw new MailNotConfiguredError();
        console.warn(`[mailer] SMTP chưa cấu hình, bỏ qua gửi email tới ${to}: "${subject}"`);
        console.warn(`[mailer] (dev) nội dung:\n${text}`);
        return { skipped: true };
    }

    await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text
    });
    return { skipped: false };
};
