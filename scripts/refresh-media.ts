/**
 * refresh-media.ts — non-destructive refresh of promotion gallery images.
 *
 * The dev DB was seeded before the gallery images were switched to real
 * Unsplash photos, and the seed's "already seeded" guard prevents a re-run.
 * This script only touches media_assets: for every existing promotion it
 * deletes the IMAGE_GALLERY assets and inserts a fresh set of real photos
 * (cover + 5 gallery), matched to the property type, so the detail page
 * "Cómo será tu hogar" mosaic renders real images for all promotions.
 *
 * Run: pnpm tsx scripts/refresh-media.ts
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import * as schema from "../src/infrastructure/db/schema";

// ─── Load .env.local (same manual parser as the seed) ──────────────────────
const envLocalPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const U = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

type Shot = { id: string; caption: string };

// Curated, license-clear Unsplash photo ids (same set as the seed).
const HOUSE: Shot[] = [
  { id: "1568605114967-8130f3a36994", caption: "Fachada" },
  { id: "1600210491892-03d54c0aaf87", caption: "Salón" },
  { id: "1556909114-f6e7ad7d3136", caption: "Cocina" },
  { id: "1505693416388-ac5ce068fe85", caption: "Dormitorio" },
  { id: "1600566753190-17f0baa2a6c3", caption: "Baño" },
  { id: "1564013799919-ab600027ffc6", caption: "Exterior" },
];

const APARTMENT: Shot[] = [
  { id: "1545324418-cc1a3fa10c00", caption: "Fachada" },
  { id: "1600210491892-03d54c0aaf87", caption: "Salón" },
  { id: "1556909114-f6e7ad7d3136", caption: "Cocina" },
  { id: "1505693416388-ac5ce068fe85", caption: "Dormitorio" },
  { id: "1600607687939-ce8a6c25118c", caption: "Terraza" },
  { id: "1600566753190-17f0baa2a6c3", caption: "Zonas comunes" },
];

const COMMERCIAL: Shot[] = [
  { id: "1493809842364-78817add7ffb", caption: "Interior" },
  { id: "1502672260266-1c1ef2d93688", caption: "Espacio diáfano" },
  { id: "1600566753190-17f0baa2a6c3", caption: "Zonas comunes" },
  { id: "1486325212027-8081e485255e", caption: "Entorno" },
  { id: "1545324418-cc1a3fa10c00", caption: "Fachada" },
  { id: "1600210491892-03d54c0aaf87", caption: "Recepción" },
];

function shotsFor(propertyType: string | null): Shot[] {
  switch (propertyType) {
    case "casa":
    case "chalet":
    case "villa":
    case "dúplex":
      return HOUSE;
    case "local":
    case "oficina":
    case "nave":
    case "garaje":
    case "trastero":
      return COMMERCIAL;
    default:
      return APARTMENT; // piso, ático, estudio, terreno…
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not defined");
  const pool = new Pool({ connectionString: databaseUrl });
  const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

  try {
    const promos = await db
      .select({
        id: schema.promociones.id,
        tenantId: schema.promociones.tenantId,
        name: schema.promociones.name,
        propertyType: schema.promociones.propertyType,
      })
      .from(schema.promociones);

    console.log(`Refreshing gallery media for ${promos.length} promotions…`);
    let inserted = 0;

    for (const p of promos) {
      await db.transaction(async (tx) => {
        // RLS context for this tenant.
        await tx.execute(
          sql`SELECT set_config('app.current_tenant_id', ${p.tenantId}, true)`,
        );

        // Remove existing gallery assets for this promotion.
        await tx
          .delete(schema.mediaAssets)
          .where(
            and(
              eq(schema.mediaAssets.ownerType, "PROMOCION"),
              eq(schema.mediaAssets.ownerId, p.id),
              eq(schema.mediaAssets.kind, "IMAGE_GALLERY"),
            ),
          );

        // Insert a fresh set of real photos.
        const shots = shotsFor(p.propertyType);
        await tx.insert(schema.mediaAssets).values(
          shots.map((shot, index) => ({
            tenantId: p.tenantId,
            ownerType: "PROMOCION" as const,
            ownerId: p.id,
            kind: "IMAGE_GALLERY" as const,
            r2Key: U(shot.id),
            mimeType: "image/jpeg",
            altText: `${p.name} — ${shot.caption}`,
            sortOrder: index,
            isCover: index === 0,
          })),
        );
        inserted += shots.length;
      });
    }

    console.log(`Done. Inserted ${inserted} gallery images.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("refresh-media failed:", err);
  process.exit(1);
});
