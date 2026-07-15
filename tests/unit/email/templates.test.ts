import { describe, it, expect } from "vitest";
import { leadAssignedAgent } from "@/infrastructure/email/templates/lead-assigned-agent";
import { leadConfirmation } from "@/infrastructure/email/templates/lead-confirmation";
import { teamInvitation } from "@/infrastructure/email/templates/team-invitation";
import { passwordRecovery } from "@/infrastructure/email/templates/password-recovery";
import { getTemplate, getAllTemplateNames } from "@/infrastructure/email/templates";
import { TemplateNotFoundError } from "@/infrastructure/email/types";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";

// ─── Constants ────────────────────────────────────────────────────────

const BACKOFFICE_URL = "https://panel.wedomio.com/leads/123";
const RESET_URL = "https://panel.wedomio.com/reset/abc123";
const SETUP_URL = "https://panel.wedomio.com/setup/abc123";

const AGENT_NAME = "Ana García";
const LEAD_NAME = "Carlos López";
const PROMOTION_NAME = "Residencial Marina";
const CONTACT_EMAIL = "info@wedomio.com";
const INVITEE_NAME = "Pedro Martínez";
const INVITEE_ROLE = "AGENT";
const EXPIRY_MINUTES = 30;
const IT_RENDERS = "renders with valid payload";
const IT_HAS_CORRECT_NAME = "has correct name";
const IT_HAS_PAYLOAD_SCHEMA = "has a payload schema defined";

// ─── Valid payloads ──────────────────────────────────────────────────

const validLeadAssignedPayload = {
  agentName: AGENT_NAME,
  leadName: LEAD_NAME,
  promotionName: PROMOTION_NAME,
  backofficeUrl: BACKOFFICE_URL,
};

const validLeadConfirmationPayload = {
  leadName: LEAD_NAME,
  promotionName: PROMOTION_NAME,
  contactEmail: CONTACT_EMAIL,
};

const validTeamInvitationPayload = {
  inviteeName: INVITEE_NAME,
  role: INVITEE_ROLE,
  setupPasswordUrl: SETUP_URL,
};

const validPasswordRecoveryPayload = {
  userName: INVITEE_NAME,
  resetUrl: RESET_URL,
  expiryMinutes: EXPIRY_MINUTES,
};

// ─── T022: lead-assigned-agent ───────────────────────────────────────

describe("lead-assigned-agent template", () => {
  it(IT_RENDERS, () => {
    const result = leadAssignedAgent.render(validLeadAssignedPayload);

    expect(result).toBeDefined();
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it("includes agent name in subject", () => {
    const result = leadAssignedAgent.render(validLeadAssignedPayload);
    expect(result.subject).toContain("Nuevo lead asignado");
  });

  it("includes lead name and promotion name in html body", () => {
    const result = leadAssignedAgent.render(validLeadAssignedPayload);
    expect(result.html).toContain(LEAD_NAME);
    expect(result.html).toContain(PROMOTION_NAME);
  });

  it("includes backoffice url in html body", () => {
    const result = leadAssignedAgent.render(validLeadAssignedPayload);
    expect(result.html).toContain(BACKOFFICE_URL);
  });

  it("includes text version with all data", () => {
    const result = leadAssignedAgent.render(validLeadAssignedPayload);
    expect(result.text).toContain(LEAD_NAME);
    expect(result.text).toContain(PROMOTION_NAME);
    expect(result.text).toContain(BACKOFFICE_URL);
  });

  it(IT_HAS_CORRECT_NAME, () => {
    expect(leadAssignedAgent.name).toBe(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
  });

  it(IT_HAS_PAYLOAD_SCHEMA, () => {
    expect(leadAssignedAgent.payloadSchema).toBeDefined();
  });
});

// ─── T023: lead-confirmation ─────────────────────────────────────────

describe("lead-confirmation template", () => {
  it(IT_RENDERS, () => {
    const result = leadConfirmation.render(validLeadConfirmationPayload);

    expect(result).toBeDefined();
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it("includes confirmation text in subject", () => {
    const result = leadConfirmation.render(validLeadConfirmationPayload);
    expect(result.subject).toContain("recibido");
  });

  it("includes lead name and promotion name in html body", () => {
    const result = leadConfirmation.render(validLeadConfirmationPayload);
    expect(result.html).toContain(LEAD_NAME);
    expect(result.html).toContain(PROMOTION_NAME);
  });

  it("includes contact email in html body", () => {
    const result = leadConfirmation.render(validLeadConfirmationPayload);
    expect(result.html).toContain(CONTACT_EMAIL);
  });

  it(IT_HAS_CORRECT_NAME, () => {
    expect(leadConfirmation.name).toBe(EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION);
  });

  it(IT_HAS_PAYLOAD_SCHEMA, () => {
    expect(leadConfirmation.payloadSchema).toBeDefined();
  });
});

// ─── T024: team-invitation ───────────────────────────────────────────

describe("team-invitation template", () => {
  it(IT_RENDERS, () => {
    const result = teamInvitation.render(validTeamInvitationPayload);

    expect(result).toBeDefined();
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it("includes invitation text in subject", () => {
    const result = teamInvitation.render(validTeamInvitationPayload);
    expect(result.subject).toContain("Invitación");
  });

  it("includes invitee name and role in html body", () => {
    const result = teamInvitation.render(validTeamInvitationPayload);
    expect(result.html).toContain(INVITEE_NAME);
    expect(result.html).toContain(INVITEE_ROLE);
  });

  it("includes setup password url in html body", () => {
    const result = teamInvitation.render(validTeamInvitationPayload);
    expect(result.html).toContain(SETUP_URL);
  });

  it(IT_HAS_CORRECT_NAME, () => {
    expect(teamInvitation.name).toBe(EMAIL_TEMPLATE_NAMES.TEAM_INVITATION);
  });

  it(IT_HAS_PAYLOAD_SCHEMA, () => {
    expect(teamInvitation.payloadSchema).toBeDefined();
  });
});

// ─── T025: password-recovery ─────────────────────────────────────────

describe("password-recovery template", () => {
  it(IT_RENDERS, () => {
    const result = passwordRecovery.render(validPasswordRecoveryPayload);

    expect(result).toBeDefined();
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it("includes recovery text in subject", () => {
    const result = passwordRecovery.render(validPasswordRecoveryPayload);
    expect(result.subject).toContain("Recuperación");
  });

  it("includes user name and reset url in html body", () => {
    const result = passwordRecovery.render(validPasswordRecoveryPayload);
    expect(result.html).toContain(INVITEE_NAME);
    expect(result.html).toContain(RESET_URL);
  });

  it("includes expiry notice in html body", () => {
    const result = passwordRecovery.render(validPasswordRecoveryPayload);
    expect(result.html).toContain(String(EXPIRY_MINUTES));
  });

  it("includes expiry in text version", () => {
    const result = passwordRecovery.render(validPasswordRecoveryPayload);
    expect(result.text).toContain(String(EXPIRY_MINUTES));
  });

  it(IT_HAS_CORRECT_NAME, () => {
    expect(passwordRecovery.name).toBe(EMAIL_TEMPLATE_NAMES.PASSWORD_RECOVERY);
  });

  it(IT_HAS_PAYLOAD_SCHEMA, () => {
    expect(passwordRecovery.payloadSchema).toBeDefined();
  });
});

// ─── T026: template registry rejects invalid payload ─────────────────

describe("template registry", () => {
  describe("getTemplate", () => {
    it("returns template for known name", () => {
      const tmpl = getTemplate(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
      expect(tmpl).toBeDefined();
      expect(tmpl.name).toBe(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
    });

    it("throws TemplateNotFoundError for unknown name", () => {
      expect(() => getTemplate("non-existent-template")).toThrow(TemplateNotFoundError);
    });

    it("rejects invalid payload via the template schema", () => {
      const tmpl = getTemplate(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
      const invalidPayload = {
        agentName: AGENT_NAME,
        // missing leadName
        promotionName: PROMOTION_NAME,
        backofficeUrl: BACKOFFICE_URL,
      };
      const result = tmpl.payloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("rejects payload with wrong field types", () => {
      const tmpl = getTemplate(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
      const invalidPayload = {
        agentName: AGENT_NAME,
        leadName: LEAD_NAME,
        promotionName: PROMOTION_NAME,
        backofficeUrl: "not-a-url",
      };
      const result = tmpl.payloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("getAllTemplateNames", () => {
    it("returns all 6 template names", () => {
      const names = getAllTemplateNames();
      expect(names).toHaveLength(6);
      expect(names).toContain(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
      expect(names).toContain(EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION);
      expect(names).toContain(EMAIL_TEMPLATE_NAMES.TEAM_INVITATION);
      expect(names).toContain(EMAIL_TEMPLATE_NAMES.PASSWORD_RECOVERY);
      expect(names).toContain(EMAIL_TEMPLATE_NAMES.CONTACT_FORM_NOTIFICATION);
    });
  });
});
