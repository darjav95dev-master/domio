"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateLeadStatusAction,
  addNoteAction,
  reassignLeadAction,
  getLeadDetailAction,
} from "@/features/leads/actions/leads.actions";
import { LEAD_STATUS_TRANSITIONS } from "@/shared/types/lead-schema";
import type {
  LeadRow,
  LeadNoteRow,
  LeadHistoryRow,
} from "@/infrastructure/db/repositories/lead.repository";
import type { LeadStatus } from "@/shared/constants/db-enums";

export interface UseLeadDetailReturn {
  notes: LeadNoteRow[];
  history: LeadHistoryRow[];
  currentStatus: LeadStatus;
  noteText: string;
  noteError: string | null;
  isPending: boolean;
  validTransitions: LeadStatus[];
  handleStatusChange: (newStatus: string) => void;
  handleAddNote: (formData: FormData) => Promise<void>;
  handleReassign: (formData: FormData) => Promise<void>;
  setNoteText: (text: string) => void;
  setNoteError: (error: string | null) => void;
  showReassign: boolean;
  setShowReassign: (show: boolean) => void;
  reassignAgentId: string;
  setReassignAgentId: (id: string) => void;
}

export function useLeadDetail(
  lead: LeadRow,
  initialNotes: LeadNoteRow[],
  initialHistory: LeadHistoryRow[],
): UseLeadDetailReturn {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [notes, setNotes] = useState<LeadNoteRow[]>(initialNotes);
  const [history, setHistory] = useState<LeadHistoryRow[]>(initialHistory);
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(
    lead.status as LeadStatus,
  );
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const [showReassign, setShowReassign] = useState(false);
  const [reassignAgentId, setReassignAgentId] = useState("");

  const validTransitions = LEAD_STATUS_TRANSITIONS[currentStatus] ?? [];

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      const status = newStatus as LeadStatus;
      if (!validTransitions.includes(status)) return;

      setNoteError(null);
      startTransition(async () => {
        try {
          const updated = await updateLeadStatusAction(lead.id, status);
          setCurrentStatus(updated.status as LeadStatus);

          // Re-fetch history to show the new entry
          const detail = await getLeadDetailAction(lead.id);
          setHistory(detail.history);
        } catch (err) {
          setNoteError(
            err instanceof Error ? err.message : "Error al cambiar estado",
          );
        }
      });
    },
    [lead.id, validTransitions],
  );

  const handleAddNote = useCallback(
    async (formData: FormData) => {
      const text = formData.get("note") as string;
      if (!text?.trim()) {
        setNoteError("La nota no puede estar vacía");
        return;
      }

      setNoteError(null);
      startTransition(async () => {
        try {
          const newNote = await addNoteAction(lead.id, text.trim());
          setNotes((prev) => [newNote, ...prev]);
          setNoteText("");
        } catch (err) {
          setNoteError(
            err instanceof Error ? err.message : "Error al añadir nota",
          );
        }
      });
    },
    [lead.id],
  );

  const handleReassign = useCallback(
    async (formData: FormData) => {
      const agentId = formData.get("agentId") as string;
      if (!agentId?.trim()) {
        return;
      }

      startTransition(async () => {
        try {
          await reassignLeadAction(lead.id, agentId.trim());
          setShowReassign(false);
          setReassignAgentId("");
          router.refresh();
        } catch (err) {
          setNoteError(
            err instanceof Error ? err.message : "Error al reasignar lead",
          );
        }
      });
    },
    [lead.id, router],
  );

  return {
    notes,
    history,
    currentStatus,
    noteText,
    noteError,
    isPending,
    validTransitions,
    handleStatusChange,
    handleAddNote,
    handleReassign,
    setNoteText,
    setNoteError,
    showReassign,
    setShowReassign,
    reassignAgentId,
    setReassignAgentId,
  };
}
