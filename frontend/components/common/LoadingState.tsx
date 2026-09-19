export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center py-16">
      <div className="flex items-center gap-2.5 text-[13px] text-ink-dim" role="status">
        <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-line-strong border-t-ink-dim" />
        {label}…
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-raised" />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <h3 className="text-sm font-medium text-state-fragile">Something went wrong</h3>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-dim">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-line-strong px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-raised"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
