"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-semibold text-[var(--status-err)]">
          Error
        </span>
        <p className="max-w-md text-center text-sm text-[var(--text-muted)]">
          {error.message || "Algo salio mal. Intenta de nuevo."}
        </p>
      </div>
      <button
        onClick={reset}
        className="mt-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      >
        Reintentar
      </button>
    </div>
  );
}
