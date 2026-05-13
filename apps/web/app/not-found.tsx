import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-semibold text-[var(--dm-accent)]">
          404
        </span>
        <div className="h-10 w-px bg-[var(--border)]" />
        <span className="text-[var(--text-muted)]">Pagina no encontrada</span>
      </div>
      <Link
        href="/chat"
        className="mt-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      >
        Volver al chat
      </Link>
    </div>
  );
}
