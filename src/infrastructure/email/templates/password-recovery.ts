import { EMAIL_TEMPLATE_NAMES, passwordRecoverySchema } from "@/shared/constants/email-templates";
import type { EmailTemplate } from "@/infrastructure/email/types";
import type { z } from "zod";
import { escapeHtml } from "./utils";

export type PasswordRecoveryPayload = z.infer<typeof passwordRecoverySchema>;

function renderHtml(payload: PasswordRecoveryPayload): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recuperación de contraseña</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; padding: 24px; background-color: #f4f4f4;">
  <table align="center" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #1a1a2e; font-size: 22px; margin: 0 0 16px;">Recuperación de contraseña</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hola, <strong>${escapeHtml(payload.userName)}</strong>:</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Domio.</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(payload.resetUrl)}" style="background-color: #1a1a2e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 15px; display: inline-block;">Restablecer contraseña</a>
        </p>
        <p style="color: #999; font-size: 13px;">Si no puedes hacer clic, copia y pega el siguiente enlace en tu navegador:</p>
        <p style="color: #555; font-size: 13px; word-break: break-all;">${escapeHtml(payload.resetUrl)}</p>
        <p style="color: #d32f2f; font-size: 13px; font-weight: bold; margin-top: 16px;">Este enlace caducar\u00e1 en ${payload.expiryMinutes} minutos.</p>
        <p style="color: #999; font-size: 13px; margin-top: 16px;">Si no has solicitado este cambio, ignora este mensaje.</p>
        <p style="color: #999; font-size: 13px;">Este mensaje es autom\u00e1tico. No respondas a este correo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(payload: PasswordRecoveryPayload): string {
  return [
    `Recuperación de contraseña`,
    ``,
    `Hola, ${payload.userName}:`,
    ``,
    `Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Domio.`,
    ``,
    `Para crear una nueva contraseña, visita:`,
    `${payload.resetUrl}`,
    ``,
    `Importante: Este enlace caducará en ${payload.expiryMinutes} minutos.`,
    ``,
    `Si no has solicitado este cambio, ignora este mensaje.`,
    `---`,
    `Este mensaje es automático. No respondas a este correo.`,
  ].join("\n");
}

export const passwordRecovery: EmailTemplate<PasswordRecoveryPayload> = {
  name: EMAIL_TEMPLATE_NAMES.PASSWORD_RECOVERY,
  payloadSchema: passwordRecoverySchema,
  render(payload: PasswordRecoveryPayload) {
    return {
      subject: "Recuperación de contraseña",
      html: renderHtml(payload),
      text: renderText(payload),
    };
  },
};
