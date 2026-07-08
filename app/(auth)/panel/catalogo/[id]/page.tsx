import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { db } from "@/infrastructure/db/client";
import { users } from "@/infrastructure/db/schema/users";
import { mediaAssets } from "@/infrastructure/db/schema/media-assets";
import { MediaService } from "@/infrastructure/media/media.service";
import { validateMediaForPublish } from "@/features/promociones/actions/media.actions";
import {
  PromocionForm,
  type PromocionFormData,
} from "@/features/promociones/components/promocion-form";
import { BlocksEditor } from "@/features/promociones/components/blocks-editor";
import type { BlockEditorItem } from "@/features/promociones/components/blocks-editor";
import type { TipologiaEditorItem } from "@/features/promociones/components/tipologia-editor";
import type { AgentOption } from "@/features/promociones/components/promocion-section-agent";
import type { ConstructionWarning } from "@/features/promociones/components/promocion-section-commercial-status";
import {
  MediaGallery,
  type MediaAssetItem,
} from "@/features/promociones/components/media-gallery";

/**
 * Computes a soft warning when construction_status contradicts
 * the entrega_estimada from the PLAZOS_GARANTIAS content block.
 * Extracted to reduce cognitive complexity of the page component.
 */
function computeWarning(
  constructionStatus: string | null,
  blockPayload: Record<string, unknown> | null,
): ConstructionWarning | null {
  if (!constructionStatus || !blockPayload?.entrega_estimada) return null;

  const dateStr = String(blockPayload.entrega_estimada);
  const entregaEstimada = new Date(dateStr);
  if (Number.isNaN(entregaEstimada.getTime())) return null;

  const now = new Date();
  const formattedDate = entregaEstimada.toISOString().slice(0, 10);
  const isPast = entregaEstimada < now;
  const isFuture = entregaEstimada > now;

  if (constructionStatus === "ON_PLAN" && isPast) {
    return {
      type: "CONSTRUCTION_WARNING",
      message: `Marcado como sobre plano pero la fecha de entrega (${formattedDate}) ya ha pasado`,
      entregaEstimada: formattedDate,
    };
  }
  if (constructionStatus === "READY" && isFuture) {
    return {
      type: "CONSTRUCTION_WARNING",
      message: `Marcado como terminado pero la fecha de entrega (${formattedDate}) está en el futuro`,
      entregaEstimada: formattedDate,
    };
  }
  if (constructionStatus === "IN_CONSTRUCTION" && isPast) {
    return {
      type: "CONSTRUCTION_WARNING",
      message: `Marcado como en construcción pero la fecha de entrega (${formattedDate}) ya ha pasado`,
      entregaEstimada: formattedDate,
    };
  }
  return null;
}

/**
 * Loads media assets for a promotion and maps them into gallery/plan arrays.
 */
async function loadMediaAssets(
  authCtx: AuthenticatedContext,
  tenantId: string,
  ownerId: string,
): Promise<{ gallery: MediaAssetItem[]; plans: MediaAssetItem[] }> {
  const gallery: MediaAssetItem[] = [];
  const plans: MediaAssetItem[] = [];

  try {
    const rows = await authCtx.withTransaction(async (tx) => {
      return tx
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.ownerId, ownerId))
        .orderBy(mediaAssets.sortOrder);
    });

    const mediaService = new MediaService(tenantId);

    for (const asset of rows) {
      const previewUrl = mediaService.getPublicUrl(asset.r2Key);
      const item: MediaAssetItem = {
        id: asset.id,
        r2Key: asset.r2Key,
        kind: asset.kind,
        altText: asset.altText,
        sortOrder: asset.sortOrder,
        isCover: asset.isCover ?? false,
        previewUrl,
        mimeType: asset.mimeType,
      };
      if (asset.kind === "IMAGE_GALLERY") {
        gallery.push(item);
      } else if (asset.kind === "PLAN") {
        plans.push(item);
      }
    }
  } catch {
    // Non-blocking
  }

  return { gallery, plans };
}

/**
 * Computes the publishBlocked info from block and media validation errors.
 */
function computePublishBlocked(
  blockErrors: Array<{ blockType: string; issues: string[] }>,
  mediaErrors: string[],
) {
  const hasBlockErrors = blockErrors.length > 0;
  const hasMediaErrors = mediaErrors.length > 0;

  if (!hasBlockErrors && !hasMediaErrors) return null;

  let message: string;
  if (hasBlockErrors && hasMediaErrors) {
    message =
      "Hay bloques editoriales y medios con datos inválidos. Corrígelos antes de publicar.";
  } else if (hasBlockErrors) {
    message =
      "Hay bloques editoriales con datos inválidos. Corrígelos antes de publicar.";
  } else {
    message =
      "Hay medios con datos inválidos. Corrígelos antes de publicar.";
  }

  return {
    message,
    errors: blockErrors,
    mediaErrors: hasMediaErrors ? mediaErrors : undefined,
  };
}

/**
 * EditPromocionPage — página de edición de promoción.
 *
 * Server component con auth guard. Obtiene los datos directamente desde
 * PromocionRepository (más fiable que fetch interno) y la lista de
 * agentes del tenant desde la base de datos.
 *
 * Renderiza:
 * 1. Back link al catálogo + heading con nombre
 * 2. PromocionForm (incluye el editor de tipologías internamente)
 *
 * **A11y:** navegación semántica, back link con icono, heading con role.
 */
export default async function EditPromocionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/panel/login");
  }

  const { id } = await params;

  // ── Fetch promoción via repository ────────────────────────────────────
  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repository = new PromocionRepository(authCtx);
  const raw = await repository.findById(id);

  if (!raw) {
    redirect("/panel/catalogo");
  }

  // AGENT role scope: only assigned promociones
  if (
    session.role === "AGENT" &&
    raw.assignedAgentId !== session.userId
  ) {
    redirect("/panel/catalogo");
  }

  // ── Compute constructionWarning server-side ───────────────────────────

  let constructionWarning: ConstructionWarning | null = null;
  try {
    const blockPayload = await repository.findContentBlock(
      id,
      "PLAZOS_GARANTIAS",
    );
    const payload = blockPayload as Record<string, unknown> | null;
    constructionWarning = computeWarning(raw.constructionStatus, payload);
  } catch {
    // Non-blocking — warning is optional, fail silently
  }

  // ── Build tipología editor items ──────────────────────────────────────

  const tipologiaItems: TipologiaEditorItem[] = (raw.tipologias ?? []).map(
    (t) => ({
      _tempId: t.id,
      name: t.name,
      usefulArea: t.usefulArea,
      builtArea: t.builtArea,
      floors: t.floors,
      bedrooms: t.bedrooms,
      bathrooms: t.bathrooms,
      yearBuilt: t.yearBuilt,
      energyCert: t.energyCert,
      referencePriceSale: t.referencePriceSale,
      referencePriceRent: t.referencePriceRent,
      communityFee: t.communityFee,
      deposit: t.deposit,
      amenities: t.amenities ?? [],
      unidades: (t.unidades ?? []).map((u) => ({
        _tempId: u.id,
        identifier: u.identifier,
        status: u.status,
      })),
    }),
  );

  // ── Build form data (includes tipologias) ──────────────────────────────

  const formData: PromocionFormData = {
    name: raw.name,
    kind: raw.kind,
    status: raw.status,
    propertyType: raw.propertyType,
    operation: raw.operation,
    constructionStatus: raw.constructionStatus,
    island: raw.island,
    municipality: raw.municipality,
    address: raw.address,
    mapPrivacyMode: raw.mapPrivacyMode ?? "AREA",
    seoTitle: raw.seoTitle,
    seoDescription: raw.seoDescription,
    assignedAgentId: raw.assignedAgentId,
    tipologias: tipologiaItems,
  };

  // ── Fetch and validate content blocks for publish check (T030) ───────

  let initialBlocks: BlockEditorItem[] = [];
  let blockValidationErrors: Array<{
    blockType: string;
    issues: string[];
  }> = [];

  try {
    const dbBlocks = await repository.findAllContentBlocks(id);
    initialBlocks = dbBlocks.map((b) => ({
      id: b.id,
      blockType: b.blockType as BlockEditorItem["blockType"],
      payload: (b.payload ?? {}) as Record<string, unknown>,
      sortOrder: b.sortOrder,
    }));

    // Run publish validation server-side
    const validated = await repository.validateBlocksForPublish(id);
    if (!validated.valid) {
      blockValidationErrors = validated.errors.map((e) => ({
        blockType: e.blockType,
        issues: e.issues,
      }));
    }
  } catch {
    // Non-blocking — blocks are optional, fail silently
  }

  // ── Media publish validation ─────────────────────────────────────────
  let mediaPublishErrors: string[] = [];
  try {
    const mediaValidation = await validateMediaForPublish(id);
    if (!mediaValidation.valid) {
      mediaPublishErrors = mediaValidation.errors;
    }
  } catch {
    // Non-blocking
  }

  const publishBlocked = computePublishBlocked(
    blockValidationErrors,
    mediaPublishErrors,
  );

  // ── Fetch media assets ────────────────────────────────────────────────

  const { gallery: galleryAssets, plans: planAssets } = await loadMediaAssets(
    authCtx,
    session.tenantId,
    id,
  );

  // ── Fetch agents from DB ──────────────────────────────────────────────

  const agentsList: AgentOption[] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(
      and(eq(users.tenantId, session.tenantId), eq(users.role, "AGENT")),
    );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/panel/catalogo"
        className="inline-flex items-center gap-1 font-sans text-sm text-fg-subtle underline underline-offset-4 transition-colors duration-standard ease-standard hover:text-accent-default"
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Volver al catálogo
      </Link>

      {/* Heading */}
      <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-fg-default">
        {raw.name}
      </h1>

      {/* Main form — includes identity, commercial status, location, SEO,
          agent, and tipologías editor */}
      <PromocionForm
        promocionId={id}
        initialData={formData}
        agents={agentsList}
        constructionWarning={constructionWarning}
        initialDraftPayload={raw.draftPayload as Record<string, unknown> | null}
        currentStatus={raw.status}
        publishBlocked={publishBlocked}
      />

      {/* Editorial blocks section */}
      <BlocksEditor
        promocionId={id}
        kind={raw.kind as "portfolio" | "external"}
        initialBlocks={initialBlocks}
      />

      {/* Media gallery section */}
      <MediaGallery
        promocionId={id}
        initialGalleryAssets={galleryAssets}
        initialPlanAssets={planAssets}
      />
    </div>
  );
}
