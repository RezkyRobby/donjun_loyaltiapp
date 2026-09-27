import nodemailer, { type Transporter } from "nodemailer";

import { consumeEmailQuota } from "./quota";

const DEFAULT_SMTP_PORT = 465;

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || DEFAULT_SMTP_PORT;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Gmail memakai SSL pada port 465 dan STARTTLS pada port 587.
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

// Mengirim email transaksional via Gmail SMTP dengan kuota 5 email/akun/hari
// (PRD §9). Bila kredensial SMTP belum diatur di lingkungan pengembangan, isi
// email dicatat ke log agar alur verifikasi dan reset tetap dapat diuji; di
// produksi kondisi tersebut digagalkan agar tidak ada email yang hilang diam-diam.
export async function sendTransactionalEmail(
  message: EmailMessage,
): Promise<void> {
  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP belum dikonfigurasi: isi SMTP_HOST, SMTP_PORT, SMTP_USER, dan SMTP_PASS.",
      );
    }

    console.info(
      `[email] (dev, SMTP belum dikonfigurasi) ${message.subject} -> ${message.to}\n${message.text}`,
    );
    return;
  }

  consumeEmailQuota(message.to);

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}
