import crypto from "node:crypto";
import { eq, and, count, desc } from "drizzle-orm";
import { users, emailQueue } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";
import { INVITATION_TOKEN_TTL_MS } from "@/shared/constants/domain-config";
import type { UserRole } from "@/shared/constants/db-enums";
import type { UserRow, UpdateUserInput } from "@/shared/types/user-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
}

import { PaginatedResult } from "@/shared/types/pagination";

export interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class UserRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext;

  constructor(ctx: AuthenticatedContext) {
    super(ctx);
    this.authCtx = ctx;
  }

  /**
   * Returns all users for the tenant, optionally filtered by role and/or isActive.
   */
  async findAll(filters: UserFilters): Promise<PaginatedResult<UserRow>> {
    return this.withTransaction(async (tx) => {
      const conditions: ReturnType<typeof eq>[] = [
        eq(users.tenantId, this.authCtx.getTenantId()),
      ];

      if (filters.role) {
        conditions.push(eq(users.role, filters.role));
      }
      if (filters.isActive !== undefined) {
        conditions.push(eq(users.isActive, filters.isActive));
      }

      const whereClause = and(...conditions);

      const items = await tx
        .select({
          id: users.id,
          tenantId: users.tenantId,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          invitationTokenHash: users.invitationTokenHash,
          invitationTokenExpires: users.invitationTokenExpires,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt));

      const totalResult = await tx
        .select({ count: count() })
        .from(users)
        .where(whereClause);

      const total = Number(totalResult[0]?.count ?? 0);

      return { items, total };
    });
  }

  /**
   * Returns a single user by id, or null if not found within the tenant.
   */
  async findById(id: string): Promise<UserRow | null> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .select({
          id: users.id,
          tenantId: users.tenantId,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          invitationTokenHash: users.invitationTokenHash,
          invitationTokenExpires: users.invitationTokenExpires,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(
          and(
            eq(users.id, id),
            eq(users.tenantId, this.authCtx.getTenantId()),
          ),
        );

      return row ?? null;
    });
  }

  /**
   * Creates a new user and enqueues an invitation email.
   *
   * Both operations happen in the same transaction: the user INSERT and
   * the email_queue INSERT with template 'team-invitation'.
   */
  async create(data: CreateUserData): Promise<UserRow> {
    return this.withTransaction(async (tx) => {
      // Generate a real invitation token
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      const tokenExpires = new Date(Date.now() + INVITATION_TOKEN_TTL_MS);

      const [row] = await tx
        .insert(users)
        .values({
          tenantId: this.authCtx.getTenantId(),
          email: data.email,
          name: data.name,
          role: data.role,
          invitationTokenHash: tokenHash,
          invitationTokenExpires: tokenExpires,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create user");
      }

      // Enqueue invitation email
      await tx.insert(emailQueue).values({
        toEmail: data.email,
        template: EMAIL_TEMPLATE_NAMES.TEAM_INVITATION,
        payload: {
          inviteeName: data.name,
          role: data.role,
          setupPasswordUrl: `${process.env.AUTH_URL ?? ""}/auth/setup-password?token=${token}`,
        },
      });

      return row;
    });
  }

  /**
   * Verifies an invitation token by comparing it against the stored hash.
   * Returns true if the token is valid and not expired.
   */
  async verifyInvitationToken(
    token: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .select({ id: users.id, invitationTokenExpires: users.invitationTokenExpires })
        .from(users)
        .where(
          and(
            eq(users.invitationTokenHash, tokenHash),
            eq(users.tenantId, this.authCtx.getTenantId()),
          ),
        );

      if (!row) {
        return { valid: false };
      }

      if (row.invitationTokenExpires && row.invitationTokenExpires < new Date()) {
        return { valid: false };
      }

      return { valid: true, userId: row.id };
    });
  }

  /**
   * Updates editable fields of a user.
   *
   * Only name, email, and role are updatable via this method.
   * passwordHash is managed separately (password reset flow).
   */
  async update(
    id: string,
    data: UpdateUserInput,
  ): Promise<UserRow> {
    return this.withTransaction(async (tx) => {
      // Verify the user exists within the tenant
      const [current] = await tx
        .select({
          id: users.id,
          tenantId: users.tenantId,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          invitationTokenHash: users.invitationTokenHash,
          invitationTokenExpires: users.invitationTokenExpires,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(
          and(
            eq(users.id, id),
            eq(users.tenantId, this.authCtx.getTenantId()),
          ),
        );

      if (!current) {
        throw new Error(`User with id ${id} not found`);
      }

      // Build update data — only include provided fields
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.role !== undefined) updateData.role = data.role;

      // Skip update if no fields changed
      if (Object.keys(updateData).length === 0) {
        return current;
      }

      const [updated] = await tx
        .update(users)
        .set(updateData as Partial<typeof users.$inferInsert>)
        .where(
          and(
            eq(users.id, id),
            eq(users.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error(`Failed to update user with id ${id}`);
      }

      return updated;
    });
  }

  /**
   * Soft-deletes a user by setting isActive = false.
   *
   * All historical assignments (promociones, leads) remain intact.
   */
  async deactivate(id: string): Promise<UserRow> {
    return this.withTransaction(async (tx) => {
      const [updated] = await tx
        .update(users)
        .set({ isActive: false })
        .where(
          and(
            eq(users.id, id),
            eq(users.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error(`User with id ${id} not found`);
      }

      return updated;
    });
  }
}
