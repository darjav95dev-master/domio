/**
 * example-casa-particular.ts — completes and publishes a demo single-family
 * house sold by a private seller (kind = external / "captación externa"),
 * exercising the same repository path the admin editor uses.
 *
 * Run: pnpm tsx scripts/example-casa-particular.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import * as schema from "../src/infrastructure/db/schema";
import { AuthenticatedContext } from "../src/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "../src/infrastructure/db/repositories/promocion.repository";

const envLocalPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

const U = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const SLUG = "casa-unifamiliar-tegueste";
const NAME = "Casa unifamiliar en Tegueste";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  try {
    const [admin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "admin@domio.dev"));
    if (!admin) throw new Error("admin user not found");
    const tid = admin.tenantId;

    // Locate the draft created from the editor (fallback: create one).
    let [promo] = await db
      .select()
      .from(schema.promociones)
      .where(and(eq(schema.promociones.tenantId, tid), eq(schema.promociones.name, NAME)));

    const ctx = new AuthenticatedContext(tid, admin.id, admin.role as never);
    const repo = new PromocionRepository(ctx);

    if (!promo) {
      const created = await repo.create({ name: NAME, kind: "external" });
      [promo] = await db
        .select()
        .from(schema.promociones)
        .where(eq(schema.promociones.id, created.id));
    }
    const promId = promo!.id;
    console.log("promo id:", promId);

    // Full update → published, private-seller single-family house.
    await repo.update(promId, {
      name: NAME,
      kind: "external",
      status: "PUBLISHED",
      slug: SLUG,
      operation: "SALE",
      propertyType: "casa",
      constructionStatus: "READY",
      island: "Tenerife",
      municipality: "Tegueste",
      address: "Camino Las Toscas 12, Tegueste",
      location: [-16.3306, 28.5185],
      locationApprox: [-16.3306, 28.5185],
      mapPrivacyMode: "EXACT",
      seoTitle: "Casa unifamiliar en venta en Tegueste — 4 dorm.",
      seoDescription:
        "Casa unifamiliar independiente de particular en Tegueste, Tenerife. 4 dormitorios, parcela con jardín y garaje. Venta directa sin intermediarios.",
      assignedAgentId: admin.id,
      tipologias: [
        {
          name: "Vivienda unifamiliar",
          bedrooms: 4,
          bathrooms: 2,
          usefulArea: 155,
          builtArea: 182,
          floors: 2,
          energyCert: "C",
          referencePriceSale: 420000,
          amenities: ["garaje", "terraza"],
          unidades: [{ status: "AVAILABLE" }],
        },
      ],
    });

    // Content blocks (idempotent: replace).
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tid}, true)`);
      await tx
        .delete(schema.promocionContentBlocks)
        .where(eq(schema.promocionContentBlocks.promocionId, promId));
      await tx.insert(schema.promocionContentBlocks).values([
        {
          tenantId: tid,
          promocionId: promId,
          blockType: "DESCRIPCION_GENERAL",
          sortOrder: 0,
          payload: {
            text: "<p>Casa unifamiliar independiente en el corazón de Tegueste, vendida directamente por sus propietarios. Distribuida en dos plantas, ofrece 4 dormitorios, salón con salida a jardín, cocina office y garaje para dos vehículos. Orientación sur y mucha luz natural durante todo el día.</p>",
          },
        },
        {
          tenantId: tid,
          promocionId: promId,
          blockType: "MEMORIA_CALIDADES",
          sortOrder: 1,
          payload: {
            items: [
              { title: "Suelos", description: "Porcelánico rectificado en zonas comunes y tarima flotante en dormitorios." },
              { title: "Cocina", description: "Amueblada con electrodomésticos, encimera de cuarzo y office con office." },
              { title: "Climatización", description: "Aire acondicionado por conductos frío/calor y agua caliente por termo eléctrico." },
              { title: "Exteriores", description: "Parcela de 320 m² con jardín, porche cubierto y trastero exterior." },
            ],
          },
        },
        {
          tenantId: tid,
          promocionId: promId,
          blockType: "UBICACION_SERVICIOS",
          sortOrder: 2,
          payload: {
            items: [
              { service: "Supermercado", distance: "300m" },
              { service: "Colegio", distance: "600m" },
              { service: "Centro de salud", distance: "1,2km" },
              { service: "Parada de guagua", distance: "150m" },
            ],
          },
        },
      ]);

      // Gallery media (idempotent: replace).
      await tx
        .delete(schema.mediaAssets)
        .where(
          and(
            eq(schema.mediaAssets.ownerType, "PROMOCION"),
            eq(schema.mediaAssets.ownerId, promId),
            eq(schema.mediaAssets.kind, "IMAGE_GALLERY"),
          ),
        );
      const shots: Array<[string, string]> = [
        ["1568605114967-8130f3a36994", "Fachada"],
        ["1600210491892-03d54c0aaf87", "Salón"],
        ["1556909114-f6e7ad7d3136", "Cocina"],
        ["1505693416388-ac5ce068fe85", "Dormitorio"],
        ["1600566753190-17f0baa2a6c3", "Baño"],
        ["1564013799919-ab600027ffc6", "Jardín"],
      ];
      await tx.insert(schema.mediaAssets).values(
        shots.map(([id, caption], index) => ({
          tenantId: tid,
          ownerType: "PROMOCION" as const,
          ownerId: promId,
          kind: "IMAGE_GALLERY" as const,
          r2Key: U(id),
          mimeType: "image/jpeg",
          altText: `${NAME} — ${caption}`,
          sortOrder: index,
          isCover: index === 0,
        })),
      );
    });

    console.log(`Published ${NAME} at /inmuebles/${SLUG}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("example failed:", e);
  process.exit(1);
});
