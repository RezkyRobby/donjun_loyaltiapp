// Template email transaksional (PRD §8.1, §8.2, §8.6) dalam Bahasa Indonesia
// formal. Warna mengikuti token brand (design.md §3) dan gaya ditulis inline
// karena klien email tidak memuat stylesheet eksternal.

const BRAND = {
  background: "#fdf8e8",
  accent: "#f6de8c",
  action: "#ee8838",
  actionText: "#452a18",
  text: "#452a18",
  muted: "#7d5b41",
  surface: "#ffffff",
  border: "#e8dcc2",
} as const;

const FONT_STACK = "'Plus Jakarta Sans', Arial, Helvetica, sans-serif";

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

type EmailBody = {
  preview: string;
  heading: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  notes: string[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLayout(body: EmailBody): string {
  const { preview, heading, paragraphs, actionLabel, actionUrl, notes } = body;

  const paragraphsHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.text};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");

  const notesHtml =
    notes.length > 0
      ? `<ul style="margin:24px 0 0;padding-left:20px;font-size:14px;line-height:1.6;color:${BRAND.muted};">${notes
          .map(
            (note) => `<li style="margin-bottom:8px;">${escapeHtml(note)}</li>`,
          )
          .join("")}</ul>`
      : "";

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:24px 12px;background-color:${BRAND.background};font-family:${FONT_STACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
    <div style="max-width:520px;margin:0 auto;background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:20px;padding:32px 24px;">
      <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:${BRAND.actionText};">Donjun Donat</p>
      <p style="margin:0 0 20px;font-size:14px;color:${BRAND.muted};">Program Loyalitas Pelanggan</p>
      <div style="height:4px;width:56px;border-radius:9999px;background-color:${BRAND.accent};margin-bottom:24px;"></div>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.text};">${escapeHtml(heading)}</h1>
      ${paragraphsHtml}
      <div style="margin:32px 0 8px;">
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 24px;border-radius:14px;background-color:${BRAND.action};color:${BRAND.actionText};font-size:16px;font-weight:600;text-decoration:none;">${escapeHtml(actionLabel)}</a>
      </div>
      ${notesHtml}
    </div>
    <p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.6;color:${BRAND.muted};">Email ini dikirim otomatis oleh sistem loyalitas Donjun Donat. Mohon tidak membalas email ini.</p>
  </body>
</html>`;
}

function renderText(body: EmailBody): string {
  const { heading, paragraphs, actionLabel, actionUrl, notes } = body;

  return [
    "Donjun Donat - Program Loyalitas Pelanggan",
    "",
    heading,
    "",
    ...paragraphs,
    "",
    `${actionLabel}: ${actionUrl}`,
    "",
    ...notes.map((note) => `- ${note}`),
    "",
    "Email ini dikirim otomatis oleh sistem loyalitas Donjun Donat. Mohon tidak membalas email ini.",
  ].join("\n");
}

function buildEmail(body: EmailBody, subject: string): EmailContent {
  return {
    subject,
    html: renderLayout(body),
    text: renderText(body),
  };
}

export function renderVerificationEmail(params: {
  name: string;
  url: string;
}): EmailContent {
  const body: EmailBody = {
    preview: "Verifikasi email untuk mengaktifkan akun Donjun Donat Anda.",
    heading: "Verifikasi alamat email Anda",
    paragraphs: [
      `Halo ${params.name}, terima kasih telah mendaftar pada program loyalitas Donjun Donat.`,
      "Klik tombol di bawah untuk memverifikasi alamat email dan mengaktifkan akun Anda.",
    ],
    actionLabel: "Verifikasi email",
    actionUrl: params.url,
    notes: [
      "Tautan verifikasi berlaku selama 1 jam sejak email ini dikirim.",
      "Jika Anda tidak merasa membuat akun, abaikan saja email ini.",
    ],
  };

  return buildEmail(body, "Verifikasi email akun Donjun Donat");
}

export function renderResetPasswordEmail(params: {
  name: string;
  url: string;
}): EmailContent {
  const body: EmailBody = {
    preview: "Buat kata sandi baru untuk akun Donjun Donat Anda.",
    heading: "Atur ulang kata sandi Anda",
    paragraphs: [
      `Halo ${params.name}, kami menerima permintaan untuk mengatur ulang kata sandi akun Donjun Donat Anda.`,
      "Klik tombol di bawah untuk membuat kata sandi baru.",
    ],
    actionLabel: "Atur ulang kata sandi",
    actionUrl: params.url,
    notes: [
      "Tautan ini berlaku selama 30 menit dan hanya dapat digunakan sekali.",
      "Setelah kata sandi baru tersimpan, seluruh sesi aktif di perangkat lain akan dicabut.",
      "Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini; kata sandi Anda tidak akan berubah.",
    ],
  };

  return buildEmail(body, "Atur ulang kata sandi akun Donjun Donat");
}

export function renderStaffInvitationEmail(params: {
  name: string;
  url: string;
  outletName?: string;
}): EmailContent {
  const outlet = params.outletName ? ` pada outlet ${params.outletName}` : "";

  const body: EmailBody = {
    preview: "Aktivasi akun kasir Donjun Donat Anda.",
    heading: "Aktivasi akun kasir Anda",
    paragraphs: [
      `Halo ${params.name}, Anda diundang untuk bergabung sebagai kasir Donjun Donat${outlet}.`,
      "Klik tombol di bawah untuk membuat kata sandi dan mengaktifkan akun Anda.",
    ],
    actionLabel: "Aktifkan akun kasir",
    actionUrl: params.url,
    notes: [
      "Tautan undangan ini hanya dapat digunakan sekali.",
      "Login staf dilakukan melalui halaman masuk khusus staf, tanpa pendaftaran mandiri.",
      "Jika Anda tidak merasa diundang, abaikan email ini.",
    ],
  };

  return buildEmail(body, "Undangan akun kasir Donjun Donat");
}
