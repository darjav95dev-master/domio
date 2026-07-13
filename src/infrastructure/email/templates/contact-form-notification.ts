import { EMAIL_TEMPLATE_NAMES, contactFormNotificationSchema } from "@/shared/constants/email-templates";
import type { EmailTemplate } from "@/infrastructure/email/types";
import type { z } from "zod";
import { escapeHtml } from "./utils";

export type ContactFormNotificationPayload = z.infer<typeof contactFormNotificationSchema>;

function renderHtml(payload: ContactFormNotificationPayload): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nuevo mensaje de contacto</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; padding: 24px; background-color: #f4f4f4;">
  <table align="center" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #1a1a2e; font-size: 22px; margin: 0 0 16px;">Nuevo mensaje de contacto</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Se ha recibido un nuevo mensaje desde el formulario de contacto de la web:</p>
        <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 14px; font-weight: bold; width: 80px;">Nombre</td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">${escapeHtml(payload.name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 14px; font-weight: bold;">Email</td>
            <td style="padding: 8px 0; color: #333; font-size: 15px;">
              <a href="mailto:${escapeHtml(payload.email)}" style="color: #1a1a2e;">${escapeHtml(payload.email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 14px; font-weight: bold; vertical-align: top;">Mensaje</td>
            <td style="padding: 8px 0; color: #333; font-size: 15px; white-space: pre-wrap;">${escapeHtml(payload.message)}</td>
          </tr>
        </table>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">Este mensaje fue enviado desde el formulario de contacto de wedomio.com.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(payload: ContactFormNotificationPayload): string {
  return [
    "Nuevo mensaje de contacto",
    "",
    "Se ha recibido un nuevo mensaje desde el formulario de contacto:",
    "",
    `Nombre: ${payload.name}`,
    `Email: ${payload.email}`,
    "",
    "Mensaje:",
    payload.message,
    "",
    "---",
    "Este mensaje fue enviado desde el formulario de contacto de wedomio.com.",
  ].join("\n");
}

export const contactFormNotification: EmailTemplate<ContactFormNotificationPayload> = {
  name: EMAIL_TEMPLATE_NAMES.CONTACT_FORM_NOTIFICATION,
  payloadSchema: contactFormNotificationSchema,
  render(payload: ContactFormNotificationPayload) {
    return {
      subject: `Nuevo mensaje de contacto de ${payload.name}`,
      html: renderHtml(payload),
      text: renderText(payload),
    };
  },
};
