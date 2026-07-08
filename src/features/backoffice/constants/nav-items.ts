import type { FC } from "react";
import {
  House,
  Folder,
  EnvelopeSimple,
  UsersThree,
  FileText,
  Key,
  ShieldCheck,
  type IconProps,
} from "@phosphor-icons/react";
import type { UserRole } from "@/shared/constants/db-enums";

export interface NavItem {
  label: string;
  href: string;
  icon: FC<IconProps>;
  allowedRoles: UserRole[];
  badgeKey: "unread-leads" | null;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/panel",
    icon: House,
    allowedRoles: ["ADMIN", "OPERATOR", "AGENT"],
    badgeKey: null,
  },
  {
    label: "Catálogo",
    href: "/panel/catalogo",
    icon: Folder,
    allowedRoles: ["ADMIN", "OPERATOR", "AGENT"],
    badgeKey: null,
  },
  {
    label: "Leads",
    href: "/panel/leads",
    icon: EnvelopeSimple,
    allowedRoles: ["ADMIN", "OPERATOR", "AGENT"],
    badgeKey: "unread-leads",
  },
  {
    label: "Equipo",
    href: "/panel/equipo",
    icon: UsersThree,
    allowedRoles: ["ADMIN"],
    badgeKey: null,
  },
  {
    label: "Contenidos",
    href: "/panel/contenidos",
    icon: FileText,
    allowedRoles: ["ADMIN", "OPERATOR"],
    badgeKey: null,
  },
  {
    label: "API Keys",
    href: "/panel/api-keys",
    icon: Key,
    allowedRoles: ["ADMIN"],
    badgeKey: null,
  },
  {
    label: "ARSOP",
    href: "/panel/arsop",
    icon: ShieldCheck,
    allowedRoles: ["ADMIN"],
    badgeKey: null,
  },
];
