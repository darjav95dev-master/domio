"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { cn } from "@/shared/utils/cn";
import { logger } from "@/shared/utils/logger";
import { Button } from "@/shared/components/button";
import { LeadsTable, type LeadsTableFilters } from "./leads-table";
import {
  getLeadsAction,
  exportLeadsCsvAction,
} from "@/features/leads/actions/leads.actions";
import type { LeadRow } from "@/infrastructure/db/repositories/lead.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadsPageContentProps {
  initialLeads: LeadRow[];
  initialTotal: number;
  initialPage: number;
  initialUnreadIds?: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadsPageContent({
  initialLeads,
  initialTotal,
  initialPage,
  initialUnreadIds,
}: LeadsPageContentProps) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [unreadLeadIds, setUnreadLeadIds] = useState<Set<string>>(
    () => new Set(initialUnreadIds ?? []),
  );

  // Sync when the server re-fetches fresh read marks (e.g. navigating back from a lead detail)
  useEffect(() => {
    setUnreadLeadIds(new Set(initialUnreadIds ?? []));
  }, [initialUnreadIds]);
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  const fetchLeads = useCallback(
    async (filters: LeadsTableFilters = {}, pageNum: number = 1) => {
      startTransition(async () => {
        try {
          const result = await getLeadsAction(filters, pageNum);
          setLeads(result.items);
          setTotal(result.total);
          setPage(pageNum);
        } catch (err) {
          logger.error("Failed to fetch leads:", err);
        }
      });
    },
    [],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      fetchLeads({}, newPage);
    },
    [fetchLeads],
  );

  const handleFiltersChange = useCallback(
    (filters: LeadsTableFilters, pageNum?: number) => {
      fetchLeads(filters, pageNum ?? 1);
    },
    [fetchLeads],
  );

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const csv = await exportLeadsCsvAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `leads-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error("Failed to export CSV:", err);
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg-default">
          Leads
        </h1>

        <Button
          type="button"
          variant="secondary"
          onClick={handleExportCsv}
          disabled={exporting || isPending}
          aria-label="Exportar leads a CSV"
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.08em]",
            "px-4 py-2",
          )}
        >
          {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      {/* Table with loading overlay */}
      <div className="relative">
        {isPending && (
          <div
            className="absolute inset-0 z-above flex items-center justify-center rounded-card bg-bg-canvas/60"
            aria-live="polite"
            role="status"
          >
            <span className="font-sans text-sm text-fg-muted">
              Cargando…
            </span>
          </div>
        )}

        <LeadsTable
          leads={leads}
          total={total}
          page={page}
          onPageChange={handlePageChange}
          onFiltersChange={handleFiltersChange}
          unreadLeadIds={unreadLeadIds}
        />
      </div>
    </div>
  );
}
