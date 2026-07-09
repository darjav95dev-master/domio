import { describe, it, expect } from "vitest";
import {
  EMAIL_TEMPLATE_NAMES,
  emailTemplatePayloadSchemas,
  leadAssignedAgentSchema,
  leadConfirmationSchema,
  teamInvitationSchema,
  passwordRecoverySchema,
} from "@/shared/constants/email-templates";

function expectAccepts(
  schema: { safeParse: (v: unknown) => { success: boolean } },
  payload: unknown,
) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(true);
}

function expectRejects(
  schema: { safeParse: (v: unknown) => { success: boolean } },
  payload: unknown,
) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(false);
}

function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> {
  const result = { ...obj };
  delete result[key];
  return result;
}

const BACKOFFICE_URL = "https://panel.domio.com/leads/123";
const RESET_URL = "https://panel.domio.com/reset/abc123";
const SETUP_URL = "https://panel.domio.com/setup/abc123";
const NOT_A_URL = "not-a-url";

describe("EMAIL_TEMPLATE_NAMES", () => {
  it("has exactly 5 template names", () => {
    expect(Object.keys(EMAIL_TEMPLATE_NAMES)).toHaveLength(5);
  });

  it("contains lead-assigned-agent", () => {
    expect(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT).toBe("lead-assigned-agent");
  });

  it("contains lead-confirmation", () => {
    expect(EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION).toBe("lead-confirmation");
  });

  it("contains team-invitation", () => {
    expect(EMAIL_TEMPLATE_NAMES.TEAM_INVITATION).toBe("team-invitation");
  });

  it("contains password-recovery", () => {
    expect(EMAIL_TEMPLATE_NAMES.PASSWORD_RECOVERY).toBe("password-recovery");
  });
});

describe("leadAssignedAgentSchema", () => {
  const validPayload = {
    agentName: "Ana García",
    leadName: "Carlos López",
    promotionName: "Residencial Marina",
    backofficeUrl: BACKOFFICE_URL,
  };

  it("accepts valid payload for lead-assigned-agent", () => {
    expectAccepts(leadAssignedAgentSchema, validPayload);
  });

  it("rejects missing agentName", () => {
    expectRejects(leadAssignedAgentSchema, omit(validPayload, "agentName"));
  });

  it("rejects invalid backofficeUrl", () => {
    expectRejects(leadAssignedAgentSchema, {
      ...validPayload,
      backofficeUrl: NOT_A_URL,
    });
  });
});

describe("leadConfirmationSchema", () => {
  const validPayload = {
    leadName: "Carlos López",
    promotionName: "Residencial Marina",
    contactEmail: "info@domio.com",
  };

  it("accepts valid payload for lead-confirmation", () => {
    expectAccepts(leadConfirmationSchema, validPayload);
  });

  it("rejects missing leadName", () => {
    expectRejects(leadConfirmationSchema, omit(validPayload, "leadName"));
  });

  it("rejects invalid contactEmail", () => {
    expectRejects(leadConfirmationSchema, {
      ...validPayload,
      contactEmail: "not-an-email",
    });
  });
});

describe("teamInvitationSchema", () => {
  const validPayload = {
    inviteeName: "Pedro Martínez",
    role: "AGENT",
    setupPasswordUrl: SETUP_URL,
  };

  it("accepts valid payload for team-invitation", () => {
    expectAccepts(teamInvitationSchema, validPayload);
  });

  it("rejects missing role", () => {
    expectRejects(teamInvitationSchema, omit(validPayload, "role"));
  });

  it("rejects invalid setupPasswordUrl", () => {
    expectRejects(teamInvitationSchema, {
      ...validPayload,
      setupPasswordUrl: NOT_A_URL,
    });
  });
});

describe("passwordRecoverySchema", () => {
  const validPayload = {
    userName: "Pedro Martínez",
    resetUrl: RESET_URL,
    expiryMinutes: 30,
  };

  it("accepts valid payload for password-recovery", () => {
    expectAccepts(passwordRecoverySchema, validPayload);
  });

  it("rejects missing userName", () => {
    expectRejects(passwordRecoverySchema, omit(validPayload, "userName"));
  });

  it("rejects non-positive expiryMinutes", () => {
    expectRejects(passwordRecoverySchema, {
      ...validPayload,
      expiryMinutes: 0,
    });
  });
});

describe("emailTemplatePayloadSchemas", () => {
  it("maps all 5 template names to schemas", () => {
    expect(Object.keys(emailTemplatePayloadSchemas)).toHaveLength(5);
  });

  it("has each template entry defined", () => {
    expect(emailTemplatePayloadSchemas["lead-assigned-agent"]).toBeDefined();
    expect(emailTemplatePayloadSchemas["lead-confirmation"]).toBeDefined();
    expect(emailTemplatePayloadSchemas["team-invitation"]).toBeDefined();
    expect(emailTemplatePayloadSchemas["password-recovery"]).toBeDefined();
  });
});
