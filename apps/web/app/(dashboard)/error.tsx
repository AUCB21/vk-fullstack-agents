"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-2xl font-semibold text-[var(--status-err)]">
          Error
        </span>
        <p className="max-w-md text-center text-sm text-[var(--text-muted)]">
          {error.message || "Ocurrio un error en el dashboard."}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      >
        Reintentar
      </button>
    </div>
  );
}
