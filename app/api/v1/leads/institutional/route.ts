import { NextRequest, NextResponse } from "next/server";
import {
  resolveTenantContext,
  tenantContextStorage,
  ContextResolutionError,
} from "@/infrastructure/tenant/context-middleware";
import { consentRecords } from "@/infrastructure/db/schema";
import { leads } from "@/infrastructure/db/schema";
import { leadCreationSchema } from "@/shared/types/lead-creation-schema";

// ---------------------------------------------------------------------------
// POST /api/v1/leads/institutional
//
// Crea un lead institucional con consentimiento RGPD.
// Requiere API Key via header Authorization: Bearer <key> o x-api-key.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Resolve tenant context (API key auth)
    const url = new URL(request.url);
    const ctx = resolveTenantContext({
      host: url.host,
      pathname: url.pathname,
      headers: request.headers,
    });

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = leadCreationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "El consentimiento RGPD es obligatorio",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const data = parsed.data;

    // 3. Get IP and user-agent from request headers
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // 4. Create lead + consent record atomically within the tenant context
    return await tenantContextStorage.run(ctx, async () => {
      const result = await ctx.withTransaction(async (tx) => {
        const [lead] = await tx
          .insert(leads)
          .values({
            tenantId: ctx.getTenantId(),
            promocionId: data.promocionId,
            tipologiaId: data.tipologiaId ?? null,
            source: "institutional",
            channel: data.channel ?? null,
            name: data.name,
            email: data.email,
            phone: data.phone ?? null,
            message: data.message ?? null,
          })
          .returning();

        if (!lead) {
          throw new Error("Failed to create lead");
        }

        const [consent] = await tx
          .insert(consentRecords)
          .values({
            tenantId: ctx.getTenantId(),
            leadId: lead.id,
            legalBasis: data.consentLegalBasis,
            textAccepted: data.consentTextAccepted,
            ip: ip ?? null,
            userAgent: userAgent ?? null,
          })
          .returning();

        if (!consent) {
          throw new Error("Failed to create consent record");
        }

        return { leadId: lead.id, consentId: consent.id };
      });

      return NextResponse.json(result, { status: 201 });
    });
  } catch (error) {
    if (error instanceof ContextResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
