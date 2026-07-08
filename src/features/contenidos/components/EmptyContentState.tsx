import { Button } from '@/shared/components/button';

interface EmptyContentStateProps {
  pageKey: string;
  onCreateFirst?: () => void;
}

export function EmptyContentState({ pageKey, onCreateFirst }: EmptyContentStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border-default bg-bg-default px-6 py-12 text-center"
      role="status"
    >
      <p className="font-sans text-lg text-fg-muted">
        Aún no hay contenido para esta página.
      </p>
      <p className="font-sans text-sm text-fg-subtle">
        Crea el primer bloque de contenido para <strong>{pageKey}</strong> para empezar a editarla.
      </p>
      {onCreateFirst && (
        <Button onClick={onCreateFirst} variant="primary">
          Crear primer bloque
        </Button>
      )}
    </div>
  );
}
