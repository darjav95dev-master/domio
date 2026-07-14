"use server";

import crypto from "node:crypto";
import { and, eq, gt, isNotNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { users } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { logger } from "@/shared/utils/logger";

const BCRYPT_COST = 10;

// No se exporta: en un fichero "use server", cada export debe ser una función
// async (Next lo rechaza en compilación, aunque Vitest no se entere).
const setupPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SetupPasswordResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Un único mensaje para token inexistente, caducado o ya usado: distinguirlos
// solo ayudaría a quien esté probando tokens.
const INVALID_INVITATION =
  "La invitación no es válida o ha caducado. Pide que te la reenvíen.";

/**
 * Establece la contraseña de un usuario invitado a partir del token del email.
 *
 * Ruta pública: quien llega aquí todavía no tiene contraseña, así que no puede
 * tener sesión. Se usa PublicContext para acotar la consulta al tenant público
 * vía RLS (SET LOCAL), en vez de consultar `users` a pelo como hace el login
 * —que solo funciona porque en producción la app conecta con un rol que saltea
 * el RLS—.
 *
 * El token viaja en claro por el email, pero en la base solo vive su hash sha256
 * (lo genera UserRepository.create al invitar), así que un volcado de la tabla no
 * permite suplantar a nadie. Es de un solo uso: al establecer la contraseña se borra.
 */
export async function setupPasswordAction(
  formData: FormData,
): Promise<SetupPasswordResult> {
  const parsed = setupPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Revisa los campos señalados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(parsed.data.token)
    .digest("hex");

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);

  return new PublicContext().withTransaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(
        and(
          eq(users.invitationTokenHash, tokenHash),
          isNotNull(users.invitationTokenExpires),
          gt(users.invitationTokenExpires, new Date()),
        ),
      )
      .limit(1);

    if (!user?.isActive) {
      return { success: false, error: INVALID_INVITATION };
    }

    await tx
      .update(users)
      .set({
        passwordHash,
        invitationTokenHash: null,
        invitationTokenExpires: null,
      })
      .where(eq(users.id, user.id));

    logger.info(`Contraseña establecida para el usuario ${user.id}`);

    return { success: true };
  });
}
