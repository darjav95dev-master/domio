/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  userFiltersSchema,
} from "@/shared/types/user-schema";

const VALID_EMAIL = "nuevo@example.com";
const VALID_ROLE = "AGENT";

describe("createUserSchema", () => {
  it("accepts valid user creation input", () => {
    const result = createUserSchema.safeParse({
      email: VALID_EMAIL,
      name: "Nuevo Usuario",
      role: VALID_ROLE,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createUserSchema.safeParse({
      email: "not-an-email",
      name: "Nuevo Usuario",
      role: VALID_ROLE,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({
      email: VALID_EMAIL,
      name: "Nuevo Usuario",
      role: "INVALID_ROLE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createUserSchema.safeParse({
      email: VALID_EMAIL,
      name: "",
      role: VALID_ROLE,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = createUserSchema.safeParse({
      email: VALID_EMAIL,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts partial update with just name", () => {
    const result = updateUserSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with just role", () => {
    const result = updateUserSchema.safeParse({ role: "OPERATOR" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid email in update", () => {
    const result = updateUserSchema.safeParse({ email: "bad-email" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role in update", () => {
    const result = updateUserSchema.safeParse({ role: "BAD_ROLE" });
    expect(result.success).toBe(false);
  });
});

describe("userFiltersSchema", () => {
  it("accepts valid filters", () => {
    const result = userFiltersSchema.safeParse({
      role: "ADMIN",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty filters", () => {
    const result = userFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts pagination params as strings (coerce)", () => {
    const result = userFiltersSchema.safeParse({
      page: "2",
      limit: "50",
    });
    expect(result.success).toBe(true);
  });
});
