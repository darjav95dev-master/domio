import { describe, it, expect } from "vitest";
import { NAV_ITEMS } from "../nav-items";
import { USER_ROLES } from "@/shared/constants/db-enums";

describe("NAV_ITEMS", () => {
  it("should have exactly 7 items", () => {
    expect(NAV_ITEMS).toHaveLength(7);
  });

  it("should have all items with label, href, icon, and allowedRoles", () => {
    for (const item of NAV_ITEMS) {
      expect(item).toHaveProperty("label");
      expect(typeof item.label).toBe("string");
      expect(item).toHaveProperty("href");
      expect(typeof item.href).toBe("string");
      expect(item).toHaveProperty("icon");
      // Phosphor icons are ForwardRefExoticComponent — valid in JSX
      expect(item.icon).toBeTruthy();
      expect(item).toHaveProperty("allowedRoles");
      expect(Array.isArray(item.allowedRoles)).toBe(true);
    }
  });

  it("should only contain valid UserRole values in allowedRoles", () => {
    for (const item of NAV_ITEMS) {
      for (const role of item.allowedRoles) {
        expect(USER_ROLES).toContain(role);
      }
    }
  });

  it("should have Dashboard as first item pointing to /panel", () => {
    const dashboard = NAV_ITEMS[0];
    expect(dashboard?.label).toBe("Dashboard");
    expect(dashboard?.href).toBe("/panel");
  });

  it("should have Admin-only items (Equipo, API Keys, ARSOP)", () => {
    const adminItems = NAV_ITEMS.filter(
      (item) =>
        item.label === "Equipo" ||
        item.label === "API Keys" ||
        item.label === "ARSOP",
    );
    expect(adminItems).toHaveLength(3);
    for (const item of adminItems) {
      expect(item.allowedRoles).toEqual(["ADMIN"]);
    }
  });

  it("should have public items (Dashboard, Catálogo, Leads) available to AGENT", () => {
    const agentItems = NAV_ITEMS.filter(
      (item) =>
        item.label === "Dashboard" ||
        item.label === "Catálogo" ||
        item.label === "Leads",
    );
    expect(agentItems).toHaveLength(3);
    for (const item of agentItems) {
      expect(item.allowedRoles).toContain("AGENT");
    }
  });

  it("should have Leads item with badgeKey", () => {
    const leadsItem = NAV_ITEMS.find((item) => item.label === "Leads");
    expect(leadsItem).toBeDefined();
    expect(leadsItem?.badgeKey).toBe("unread-leads");
  });

  it("should have all hrefs starting with /panel", () => {
    for (const item of NAV_ITEMS) {
      expect(item.href.startsWith("/panel")).toBe(true);
    }
  });
});
