import { EMAIL_TEMPLATE_NAMES, leadAssignedAgentSchema } from "@/shared/constants/email-templates";
import type { EmailTemplate } from "@/infrastructure/email/types";
import type { z } from "zod";
import { escapeHtml } from "./utils";

export type LeadAssignedAgentPayload = z.infer<typeof leadAssignedAgentSchema>;

function renderHtml(payload: LeadAssignedAgentPayload): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nuevo lead asignado</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; padding: 24px; background-color: #f4f4f4;">
  <table align="center" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #1a1a2e; font-size: 22px; margin: 0 0 16px;">Nuevo lead asignado</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hola, <strong>${escapeHtml(payload.agentName)}</strong>:</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Se te ha asignado un nuevo lead para la promoción <strong>${escapeHtml(payload.promotionName)}</strong>.</p>
        <table cellpadding="8" style="border: 1px solid #ddd; border-radius: 4px; margin: 20px 0;">
          <tr><td style="font-weight: bold; color: #333;">Nombre del lead</td><td style="color: #555;">${escapeHtml(payload.leadName)}</td></tr>
          <tr><td style="font-weight: bold; color: #333;">Promoción</td><td style="color: #555;">${escapeHtml(payload.promotionName)}</td></tr>
        </table>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(payload.backofficeUrl)}" style="background-color: #1a1a2e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 15px; display: inline-block;">Ver lead en el backoffice</a>
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">Este mensaje es automático. No respondas a este correo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(payload: LeadAssignedAgentPayload): string {
  return [
    `Nuevo lead asignado`,
    ``,
    `Hola, ${payload.agentName}:`,
    ``,
    `Se te ha asignado un nuevo lead para la promoción ${payload.promotionName}.`,
    ``,
    `Nombre del lead: ${payload.leadName}`,
    `Promoción: ${payload.promotionName}`,
    ``,
    `Puedes ver los detalles en el backoffice:`,
    `${payload.backofficeUrl}`,
    ``,
    `---`,
    `Este mensaje es automático. No respondas a este correo.`,
  ].join("\n");
}

export const leadAssignedAgent: EmailTemplate<LeadAssignedAgentPayload> = {
  name: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
  payloadSchema: leadAssignedAgentSchema,
  render(payload: LeadAssignedAgentPayload) {
    return {
      subject: `Nuevo lead asignado: ${payload.promotionName}`,
      html: renderHtml(payload),
      text: renderText(payload),
    };
  },
};
