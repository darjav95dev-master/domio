import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

// ─── Module augmentation for custom claims ──────────────────────────────────

declare module "next-auth" {
  interface User {
    tenant_id: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      tenant_id: string;
      role: string;
      name: string | null;
    };
  }
}

// ─── Auth configuration ─────────────────────────────────────────────────────
//
// NOTE: Node.js-specific imports (db, bcrypt) are lazily loaded inside the
// `authorize` callback to preserve Edge runtime compatibility in middleware.
// The `auth()` wrapper used in middleware only reads JWT cookies and does
// NOT invoke authorize — so this config is safe to import from middleware.ts.

export const authConfig: NextAuthOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        // Lazy imports: only resolved in route handler context, not in middleware
        const { and, eq } = await import("drizzle-orm");
        const { users } = await import("@/infrastructure/db/schema");
        const { PublicContext } = await import(
          "@/infrastructure/tenant/PublicContext"
        );
        const bcrypt = await import("bcryptjs");

        // Quien intenta entrar aún no tiene sesión, así que no hay tenant que
        // sacar del JWT: se usa el del despliegue (PUBLIC_TENANT_ID). Consultar
        // `users` a pelo solo funcionaba porque la app conectaba con un rol que
        // saltea el RLS; con el rol restringido la política de `users` exige
        // app.current_tenant_id y la consulta devolvería cero filas.
        const context = new PublicContext();
        const [user] = await context.withTransaction((tx) =>
          tx
            .select()
            .from(users)
            .where(
              and(
                eq(users.email, email),
                eq(users.tenantId, context.getTenantId()),
              ),
            )
            .limit(1),
        );

        if (!user || !user.passwordHash || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenantId,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as {
          id: string;
          tenant_id: string;
          role: string;
          name?: string | null;
        };
        token.user_id = customUser.id;
        token.tenant_id = customUser.tenant_id;
        token.role = customUser.role;
        token.name = customUser.name;
        // Record the time of last isActive verification (initial login counts as verified)
        token.lastVerifiedAt = Date.now();
      } else if (token.user_id) {
        // ponytail: check isActive at most every 5 min to catch deactivated users
        const VERIFY_INTERVAL_MS = 5 * 60 * 1_000;
        const lastVerifiedAt = (token.lastVerifiedAt as number | undefined) ?? 0;
        if (Date.now() - lastVerifiedAt > VERIFY_INTERVAL_MS) {
          const { eq } = await import("drizzle-orm");
          const { db } = await import("@/infrastructure/db/client");
          const { users } = await import("@/infrastructure/db/schema");
          const [dbUser] = await db
            .select({ isActive: users.isActive })
            .from(users)
            .where(eq(users.id, token.user_id as string))
            .limit(1);
          if (!dbUser?.isActive) {
            // ponytail: NextAuth v4 types don't declare null but runtime supports it to destroy the session
            return null as unknown as import("next-auth/jwt").JWT;
          }
          token.lastVerifiedAt = Date.now();
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const userRecord = session.user as unknown as Record<string, unknown>;
        userRecord.id = token.user_id;
        userRecord.tenant_id = token.tenant_id;
        userRecord.role = token.role;
        userRecord.name = (token.name ?? null) as string | null;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours
    updateAge: 60 * 60, // 1 hour — sliding renewal
  },

  pages: {
    signIn: "/panel/login",
  },
};

// ─── v5-compatible interface wrapping v4 NextAuth ───────────────────────────
//
// ponytail: NextAuth v4 returns a handler fn; mocked/v5 returns {handlers, auth, signIn, signOut}.
// We detect which shape we got and provide fallbacks so both test mocks and
// v4 production behave correctly.

const _na = NextAuth(authConfig) as unknown as {
  handlers?: { GET: (...args: unknown[]) => unknown; POST: (...args: unknown[]) => unknown };
  auth?: (...args: unknown[]) => Promise<unknown>;
  signIn?: (...args: unknown[]) => unknown;
  signOut?: (...args: unknown[]) => unknown;
};

export const handlers = _na.handlers ?? {
  GET: _na as unknown as (...args: unknown[]) => unknown,
  POST: _na as unknown as (...args: unknown[]) => unknown,
};

// auth() works in both Edge (with req → getToken) and Node.js (without req → getServerSession)
export const auth = _na.auth ?? async function auth(req?: unknown) {
  if (req) {
    const { getToken } = await import("next-auth/jwt");
    const token = await getToken({
      req: req as Parameters<typeof getToken>[0]["req"],
      secret: process.env.AUTH_SECRET,
    });
    if (!token) return null;
    return {
      user: {
        id: token.user_id,
        tenant_id: token.tenant_id,
        role: token.role,
        name: (token.name as string | null) ?? null,
      },
      expires: new Date(((token.exp as number) ?? 0) * 1000).toISOString(),
    };
  }
  const { getServerSession } = await import("next-auth");
  return getServerSession(authConfig);
};

export const signIn = _na.signIn ?? null;
export const signOut = _na.signOut ?? null;
