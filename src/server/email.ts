export type EmailRecipient = {
  name: string;
  email: string;
};

// Pengiriman email transaksional. Transport Gmail SMTP (Nodemailer) beserta
// kuota 5 email/akun/hari diimplementasikan pada Fase 1 Task 7; sampai saat itu
// tautan dicatat ke log server agar alur verifikasi dan reset tetap dapat diuji.
export async function sendVerificationEmail(params: {
  user: EmailRecipient;
  url: string;
}): Promise<void> {
  console.info(
    `[email] Tautan verifikasi untuk ${params.user.email}: ${params.url}`,
  );
}

export async function sendResetPasswordEmail(params: {
  user: EmailRecipient;
  url: string;
}): Promise<void> {
  console.info(
    `[email] Tautan reset kata sandi untuk ${params.user.email}: ${params.url}`,
  );
}
