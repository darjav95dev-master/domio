import type { EmailTemplate } from "@/infrastructure/email/types";
import { TemplateNotFoundError } from "@/infrastructure/email/types";
import { leadAssignedAgent } from "@/infrastructure/email/templates/lead-assigned-agent";
import { leadConfirmation } from "@/infrastructure/email/templates/lead-confirmation";
import { teamInvitation } from "@/infrastructure/email/templates/team-invitation";
import { passwordRecovery } from "@/infrastructure/email/templates/password-recovery";

const templateRegistry: Record<string, EmailTemplate> = {
  [leadAssignedAgent.name]: leadAssignedAgent,
  [leadConfirmation.name]: leadConfirmation,
  [teamInvitation.name]: teamInvitation,
  [passwordRecovery.name]: passwordRecovery,
};

/**
 * Retrieve a template by name.
 * Throws TemplateNotFoundError if the name does not match any registered template.
 */
export function getTemplate(name: string): EmailTemplate {
  const tmpl = templateRegistry[name];
  if (!tmpl) {
    throw new TemplateNotFoundError(`Unknown template: ${name}`, name);
  }
  return tmpl;
}

/**
 * Returns all registered template names.
 */
export function getAllTemplateNames(): string[] {
  return Object.keys(templateRegistry);
}
