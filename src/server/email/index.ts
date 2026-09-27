import {
  renderResetPasswordEmail,
  renderStaffInvitationEmail,
  renderVerificationEmail,
} from "./templates";
import { sendTransactionalEmail } from "./transport";

export type EmailRecipient = {
  name: string;
  email: string;
};

export { checkEmailQuota, EmailQuotaError } from "./quota";
export type { EmailQuotaReason, EmailQuotaStatus } from "./quota";

export async function sendVerificationEmail(params: {
  user: EmailRecipient;
  url: string;
}): Promise<void> {
  const content = renderVerificationEmail({
    name: params.user.name,
    url: params.url,
  });

  await sendTransactionalEmail({ to: params.user.email, ...content });
}

export async function sendResetPasswordEmail(params: {
  user: EmailRecipient;
  url: string;
}): Promise<void> {
  const content = renderResetPasswordEmail({
    name: params.user.name,
    url: params.url,
  });

  await sendTransactionalEmail({ to: params.user.email, ...content });
}

// Dipakai alur Manajemen Akun Staf (PRD §8.6) saat undangan aktivasi kasir
// dikirim atau dikirim ulang; tautan aktivasi dibuat oleh pemanggil.
export async function sendStaffInvitationEmail(params: {
  user: EmailRecipient;
  url: string;
  outletName?: string;
}): Promise<void> {
  const content = renderStaffInvitationEmail({
    name: params.user.name,
    url: params.url,
    outletName: params.outletName,
  });

  await sendTransactionalEmail({ to: params.user.email, ...content });
}
