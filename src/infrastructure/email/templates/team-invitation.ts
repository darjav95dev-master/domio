import { EMAIL_TEMPLATE_NAMES, teamInvitationSchema } from "@/shared/constants/email-templates";
import type { EmailTemplate } from "@/infrastructure/email/types";
import type { z } from "zod";
import { escapeHtml } from "./utils";

export type TeamInvitationPayload = z.infer<typeof teamInvitationSchema>;

function renderHtml(payload: TeamInvitationPayload): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invitación al equipo Domio</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; padding: 24px; background-color: #f4f4f4;">
  <table align="center" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #1a1a2e; font-size: 22px; margin: 0 0 16px;">Invitación al equipo Domio</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hola, <strong>${escapeHtml(payload.inviteeName)}</strong>:</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Has sido invitado a unirte al equipo de Domio con el rol de <strong>${escapeHtml(payload.role)}</strong>.</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Para aceptar la invitación y establecer tu contraseña, haz clic en el siguiente enlace:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(payload.setupPasswordUrl)}" style="background-color: #1a1a2e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 15px; display: inline-block;">Aceptar invitación</a>
        </p>
        <p style="color: #999; font-size: 13px;">Si no puedes hacer clic, copia y pega el siguiente enlace en tu navegador:</p>
        <p style="color: #555; font-size: 13px; word-break: break-all;">${escapeHtml(payload.setupPasswordUrl)}</p>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">Este mensaje es automático. No respondas a este correo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(payload: TeamInvitationPayload): string {
  return [
    `Invitación al equipo Domio`,
    ``,
    `Hola, ${payload.inviteeName}:`,
    ``,
    `Has sido invitado a unirte al equipo de Domio con el rol de ${payload.role}.`,
    ``,
    `Para aceptar la invitación y establecer tu contraseña, visita:`,
    `${payload.setupPasswordUrl}`,
    ``,
    `---`,
    `Este mensaje es automático. No respondas a este correo.`,
  ].join("\n");
}

export const teamInvitation: EmailTemplate<TeamInvitationPayload> = {
  name: EMAIL_TEMPLATE_NAMES.TEAM_INVITATION,
  payloadSchema: teamInvitationSchema,
  render(payload: TeamInvitationPayload) {
    return {
      subject: `Invitación al equipo Domio - ${payload.role}`,
      html: renderHtml(payload),
      text: renderText(payload),
    };
  },
};
