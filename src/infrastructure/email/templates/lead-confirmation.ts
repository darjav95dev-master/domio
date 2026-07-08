import { EMAIL_TEMPLATE_NAMES, leadConfirmationSchema } from "@/shared/constants/email-templates";
import type { EmailTemplate } from "@/infrastructure/email/types";
import type { z } from "zod";
import { escapeHtml } from "./utils";

export type LeadConfirmationPayload = z.infer<typeof leadConfirmationSchema>;

function renderHtml(payload: LeadConfirmationPayload): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hemos recibido tu solicitud</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; padding: 24px; background-color: #f4f4f4;">
  <table align="center" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #1a1a2e; font-size: 22px; margin: 0 0 16px;">Hemos recibido tu solicitud</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hola, <strong>${escapeHtml(payload.leadName)}</strong>:</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Gracias por tu interés en <strong>${escapeHtml(payload.promotionName)}</strong>.</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hemos recibido tu solicitud de contacto. Uno de nuestros agentes se pondrá en contacto contigo en las próximas horas para proporcionarte toda la información que necesites.</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Si mientras tanto tienes alguna pregunta, puedes escribirnos a:</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="mailto:${escapeHtml(payload.contactEmail)}" style="color: #1a1a2e; font-size: 16px; font-weight: bold;">${escapeHtml(payload.contactEmail)}</a>
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">Este mensaje es automático. No respondas a este correo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(payload: LeadConfirmationPayload): string {
  return [
    `Hemos recibido tu solicitud`,
    ``,
    `Hola, ${payload.leadName}:`,
    ``,
    `Gracias por tu interés en ${payload.promotionName}.`,
    ``,
    `Hemos recibido tu solicitud de contacto. Uno de nuestros agentes se pondrá en contacto contigo en las próximas horas.`,
    ``,
    `Si tienes alguna pregunta, escríbenos a: ${payload.contactEmail}`,
    ``,
    `---`,
    `Este mensaje es automático. No respondas a este correo.`,
  ].join("\n");
}

export const leadConfirmation: EmailTemplate<LeadConfirmationPayload> = {
  name: EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION,
  payloadSchema: leadConfirmationSchema,
  render(payload: LeadConfirmationPayload) {
    return {
      subject: `Hemos recibido tu solicitud - ${payload.promotionName}`,
      html: renderHtml(payload),
      text: renderText(payload),
    };
  },
};
