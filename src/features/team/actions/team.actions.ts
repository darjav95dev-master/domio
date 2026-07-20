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

  let user;
  try {
    user = await repo.create({
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as UserRole,
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return { success: false, error: "Ya existe un usuario con ese correo electrónico en este equipo." };
    }
    throw err;
  }

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

  // El ADMIN gobierna el tenant: no se puede desactivar (ni a sí mismo ni a otro).
  const target = await repo.findById(id);
  if (target?.role === "ADMIN") {
    return {
      success: false,
      error: "No se puede desactivar a un administrador.",
    };
  }

  const user = await repo.deactivate(id);

  const warning = id === auth.ctx.userId ? "Te has desactivado a ti mismo." : undefined;

  return {
    success: true,
    data: mapUserRow(user),
    ...(warning ? { warning } : {}),
  } as ActionResult<UserResponse>;
}

/**
 * reactivateUserAction — re-enable a previously soft-deleted user.
 * Only ADMIN can call this.
 */
export async function reactivateUserAction(
  id: string,
): Promise<ActionResult<UserResponse>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  const repo = getUserRepo(auth.ctx);
  const user = await repo.reactivate(id);

  return { success: true, data: mapUserRow(user) };
}

/**
 * deleteUserAction — permanently remove a user from the tenant.
 *
 * Safety guards:
 *  - cannot delete your own account (would lock yourself out)
 *  - cannot delete the last remaining active ADMIN of the tenant
 *    (would leave the tenant without any admin access)
 *
 * Foreign keys to `users.id` are all `ON DELETE SET NULL` or `CASCADE`,
 * so the delete cannot orphan rows; historical references are nullified.
 *
 * Only ADMIN can call this.
 */
export async function deleteUserAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  // Guard: cannot delete your own account
  if (id === auth.ctx.userId) {
    return {
      success: false,
      error: "No puedes eliminar tu propia cuenta. Pide a otro administrador que lo haga.",
    };
  }

  const repo = getUserRepo(auth.ctx);

  // Verify the target user exists within the tenant and is an ADMIN worth
  // protecting (only the last-active-admin case is blocked).
  const target = await repo.findById(id);
  if (!target) {
    return { success: false, error: "El usuario no existe o no pertenece a este tenant." };
  }

  if (target.role === "ADMIN" && target.isActive) {
    const activeAdmins = await repo.countActiveAdmins();
    if (activeAdmins <= 1) {
      return {
        success: false,
        error:
          "No se puede eliminar al último administrador activo del tenant. " +
          "Nombra otro ADMIN antes de eliminarlo o desactívalo en su lugar.",
      };
    }
  }

  await repo.delete(id);

  return { success: true, data: { id } };
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
