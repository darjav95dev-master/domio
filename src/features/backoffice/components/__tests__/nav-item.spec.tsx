import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NavItem } from "../nav-item";
import type { NavItem as NavItemType } from "../../constants/nav-items";
import { Folder } from "@phosphor-icons/react";

// ─── Mock next/link (inline in factory — vitest hoists vi.mock) ───────

vi.mock("next/link", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockComp = ({ children, href, className, ...props }: any) => {
    const anchorProps: Record<string, unknown> = { href, className };
    if (props["aria-current"] === "page") anchorProps["aria-current"] = "page" as const;
    return <a {...anchorProps}>{children}</a>;
  };
  return { default: MockComp };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseItem: NavItemType = {
  label: "Catálogo",
  href: "/panel/catalogo",
  icon: Folder,
  allowedRoles: ["ADMIN", "OPERATOR", "AGENT"],
  badgeKey: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NavItem", () => {
  it("renders the item label as text", () => {
    render(
      <NavItem item={baseItem} isActive={false} currentPathname="/panel" />,
    );

    expect(screen.getByText("Catálogo")).toBeInTheDocument();
  });

  it("renders a link pointing to the item href", () => {
    render(
      <NavItem item={baseItem} isActive={false} currentPathname="/panel" />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/panel/catalogo");
  });

  it("sets aria-current='page' when active", () => {
    render(
      <NavItem item={baseItem} isActive={true} currentPathname="/panel/catalogo" />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("does NOT set aria-current when inactive", () => {
    render(
      <NavItem item={baseItem} isActive={false} currentPathname="/panel" />,
    );

    const link = screen.getByRole("link");
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("applies active border class when isActive is true", () => {
    const { container } = render(
      <NavItem item={baseItem} isActive={true} currentPathname="/panel/catalogo" />,
    );

    const link = container.querySelector("a");
    expect(link?.className).toContain("border-l-[3px]");
    expect(link?.className).toContain("border-accent-default");
  });

  it("applies transparent border class when isActive is false", () => {
    const { container } = render(
      <NavItem item={baseItem} isActive={false} currentPathname="/panel" />,
    );

    const link = container.querySelector("a");
    expect(link?.className).toContain("border-l-[3px]");
    expect(link?.className).toContain("border-transparent");
  });

  it("renders badgeKey slot element when badgeKey is set", () => {
    const itemWithBadge: NavItemType = {
      ...baseItem,
      badgeKey: "unread-leads",
    };

    render(
      <NavItem
        item={itemWithBadge}
        isActive={false}
        currentPathname="/panel"
      />,
    );

    const badgeSlot = document.querySelector('[data-badge-key="unread-leads"]');
    expect(badgeSlot).toBeInTheDocument();
    expect(badgeSlot).toHaveAttribute("aria-hidden", "true");
  });

  it("does NOT render badgeKey slot when badgeKey is null", () => {
    render(
      <NavItem item={baseItem} isActive={false} currentPathname="/panel" />,
    );

    const badgeSlot = document.querySelector("[data-badge-key]");
    expect(badgeSlot).not.toBeInTheDocument();
  });

  it("renders an icon with aria-hidden='true'", () => {
    render(
      <NavItem item={baseItem} isActive={false} currentPathname="/panel" />,
    );

    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the icon with accent color when active", () => {
    const { container } = render(
      <NavItem item={baseItem} isActive={true} currentPathname="/panel/catalogo" />,
    );

    const icon = container.querySelector("svg");
    // jsdom SVGs use SVGAnimatedString — use getAttribute instead of className
    expect(icon?.getAttribute("class")).toContain("text-accent-default");
  });
});
