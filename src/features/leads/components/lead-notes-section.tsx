"use client";

import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import type { LeadNoteRow } from "@/infrastructure/db/repositories/lead.repository";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUTTON_MONO_CLASS = "px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em]";
const INPUT_BASE = [
  "rounded-control border border-border-default px-3 py-2",
  "font-sans text-sm text-fg-default",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadNotesSectionProps {
  notes: LeadNoteRow[];
  noteText: string;
  noteError: string | null;
  isPending: boolean;
  handleAddNote: (formData: FormData) => Promise<void>;
  setNoteText: (text: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadNotesSection({
  notes,
  noteText,
  noteError,
  isPending,
  handleAddNote,
  setNoteText,
}: LeadNotesSectionProps) {
  return (
    <section
      aria-label="Notas internas"
      className="rounded-card border border-border-default bg-bg-surface p-6"
    >
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
        Notas internas
      </h2>

      {/* Note list */}
      <div className="mt-4 space-y-3">
        {notes.length === 0 && (
          <p className="font-sans text-sm text-fg-subtle">
            No hay notas todavía.
          </p>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg border border-border-subtle bg-bg-canvas p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-sm text-fg-default">{note.body}</p>
            </div>
            <p className="mt-1 font-mono text-[10px] text-fg-subtle">
              {formatDate(note.createdAt)}
            </p>
          </div>
        ))}
      </div>

      {/* Add note form */}
      <form
        action={handleAddNote}
        className="mt-4 flex items-start gap-3"
      >
        <div className="flex-1">
          <label htmlFor="note-input" className="sr-only">
            Nueva nota
          </label>
          <textarea
            id="note-input"
            name="note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escribe una nota…"
            rows={2}
            className={cn(
              INPUT_BASE.join(" "),
              "w-full bg-bg-canvas placeholder:text-fg-subtle resize-none",
            )}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isPending || !noteText.trim()}
          aria-label="Añadir nota"
          className={cn(BUTTON_MONO_CLASS)}
        >
          {isPending ? "Guardando…" : "Añadir nota"}
        </Button>
      </form>

      {noteError && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-2 font-sans text-sm text-status-danger-default"
        >
          {noteError}
        </p>
      )}
    </section>
  );
}
