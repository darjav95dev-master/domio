import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

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

export const authConfig: NextAuthConfig = {
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
        const { eq } = await import("drizzle-orm");
        const { db } = await import("@/infrastructure/db/client");
        const { users } = await import("@/infrastructure/db/schema");
        const bcrypt = await import("bcryptjs");

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

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

  trustHost: true,
};
