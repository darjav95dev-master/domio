-- Auditoría final (FIX-09 + C1-F002): endurecimiento RLS.
--
-- 1) FORCE ROW LEVEL SECURITY en toda tabla de dominio: sin FORCE, el rol
--    propietario de las tablas (el rol de aplicación en Neon) evade las
--    policies y el aislamiento multi-tenant queda anulado de facto
--    (constitution.md §11 / architecture.md §7).
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promociones" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tipologias" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "unidades" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media_assets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promocion_content_blocks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promocion_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lead_read_marks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lead_notes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lead_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consent_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "arsop_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_blocks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_config" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- 2) Históricos inmutables (C1-F002): la policy FOR ALL habilitaba UPDATE y
--    DELETE sobre tablas append-only. Se restringe a SELECT + INSERT.
DROP POLICY "lead_history_isolation" ON "lead_history";--> statement-breakpoint
CREATE POLICY "lead_history_select" ON "lead_history" AS PERMISSIVE FOR SELECT TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "lead_history_insert" ON "lead_history" AS PERMISSIVE FOR INSERT TO public WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
DROP POLICY "promocion_history_isolation" ON "promocion_history";--> statement-breakpoint
CREATE POLICY "promocion_history_select" ON "promocion_history" AS PERMISSIVE FOR SELECT TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "promocion_history_insert" ON "promocion_history" AS PERMISSIVE FOR INSERT TO public WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
DROP POLICY "consent_records_isolation" ON "consent_records";--> statement-breakpoint
CREATE POLICY "consent_records_select" ON "consent_records" AS PERMISSIVE FOR SELECT TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint
CREATE POLICY "consent_records_insert" ON "consent_records" AS PERMISSIVE FOR INSERT TO public WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
