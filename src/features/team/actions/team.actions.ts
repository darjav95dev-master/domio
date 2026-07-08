"use server";

import { UserRepository } from "@/infrastructure/db/repositories/user.repository";
import {
  createUserSchema,
  updateUserSchema,
  userFiltersSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilters,
  type UserResponse,
  type PaginatedUsers,
} from "@/shared/types/user-schema";
import { requireAdmin, type ActionResult } from "@/infrastructure/auth/require-admin";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { UserRole } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserRepo(ctx: AuthenticatedContext): UserRepository {
  return new UserRepository(ctx);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * getUsersAction — list users with optional filters (role, isActive).
 * Only ADMIN can call this.
 */
export async function getUsersAction(
  filters: UserFilters,
): Promise<ActionResult<PaginatedUsers>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  // Validate and sanitize filters
  const parsed = userFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const repo = getUserRepo(auth.ctx);
  const result = await repo.findAll({
    role: parsed.data.role as UserRole | undefined,
    isActive: parsed.data.isActive,
  });

  return {
    success: true,
    data: {
      items: result.items.map(mapUserRow),
      total: result.total,
    },
  };
}

/**
 * createUserAction — create a new user and enqueue invitation email.
 * Only ADMIN can call this.
 */
export async function createUserAction(
  data: CreateUserInput,
): Promise<ActionResult<UserResponse>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  // Validate input
  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const repo = getUserRepo(auth.ctx);
  const user = await repo.create({
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role as UserRole,
  });

  return { success: true, data: mapUserRow(user) };
}

/**
 * updateUserAction — update a user's name, email or role.
 * Only ADMIN can call this.
 */
export async function updateUserAction(
  id: string,
  data: UpdateUserInput,
): Promise<ActionResult<UserResponse>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  // Validate input
  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const repo = getUserRepo(auth.ctx);
  const user = await repo.update(id, {
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role as UserRole | undefined,
  });

  return { success: true, data: mapUserRow(user) };
}

/**
 * deactivateUserAction — soft-delete a user (isActive = false).
 * Only ADMIN can call this.
 */
export async function deactivateUserAction(
  id: string,
): Promise<ActionResult<UserResponse>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  const repo = getUserRepo(auth.ctx);
  const user = await repo.deactivate(id);

  const warning = id === auth.ctx.userId ? "Te has desactivado a ti mismo." : undefined;

  return {
    success: true,
    data: mapUserRow(user),
    ...(warning ? { warning } : {}),
  } as ActionResult<UserResponse>;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapUserRow(row: {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
