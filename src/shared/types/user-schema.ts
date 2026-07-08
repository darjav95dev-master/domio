import { z } from "zod";
import { USER_ROLES, type UserRole } from "@/shared/constants/db-enums";
import {
  USER_NAME_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/shared/constants/domain-config";

// ---------------------------------------------------------------------------
// User schemas
// ---------------------------------------------------------------------------

/**
 * Schema for creating a new user.
 * Password is NOT set at creation time — invitation email with setup link is sent.
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .max(USER_EMAIL_MAX_LENGTH, `Email demasiado largo (máx ${USER_EMAIL_MAX_LENGTH})`),
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(USER_NAME_MAX_LENGTH, `Nombre demasiado largo (máx ${USER_NAME_MAX_LENGTH})`),
  role: z.enum(USER_ROLES, { message: "Rol inválido" }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Schema for updating a user's editable fields.
 */
export const updateUserSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .max(USER_EMAIL_MAX_LENGTH, `Email demasiado largo (máx ${USER_EMAIL_MAX_LENGTH})`)
    .optional(),
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(USER_NAME_MAX_LENGTH, `Nombre demasiado largo (máx ${USER_NAME_MAX_LENGTH})`)
    .optional(),
  role: z.enum(USER_ROLES, { message: "Rol inválido" }).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Filters for listing users.
 */
export const userFiltersSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  isActive: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .optional(),
});

export type UserFilters = z.infer<typeof userFiltersSchema>;

/**
 * Response type for a user row (what the repository returns).
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/**
 * Paginated response.
 */
export const paginatedUsersSchema = z.object({
  items: z.array(userResponseSchema),
  total: z.number().int().nonnegative(),
});

export type PaginatedUsers = z.infer<typeof paginatedUsersSchema>;

// Convenience type for the repository interface
export type UserRow = {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string | null;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
